// --- HELPER FUNCTIONS ---

const getHalfDamageRounded = (roll) => {
    const evenedRoll = roll % 2 !== 0 ? roll + 1 : roll;
    return evenedRoll / 2;
};

const processDamage = (players, targetId, amount, gameLog, sourcePlayerName = 'attack', bypassGolem = false) => {
    const newPlayers = [...players];
    const playerIndex = newPlayers.findIndex(p => p.userId === targetId);
    if (playerIndex === -1 || amount <= 0) return { players: newPlayers, log: gameLog };

    let player = { ...newPlayers[playerIndex] };
    
    // Cleric in heal mode is immune
    if (player.clericHealMode) {
        gameLog.push(`${player.fullName} is immune to damage in Cleric heal mode!`);
        return { players: newPlayers, log: gameLog };
    }
    
    // Ghosts cannot be attacked
    if (player.ghostState?.active) {
        gameLog.push(`${player.fullName} is in ghost form and cannot be attacked!`);
        return { players: newPlayers, log: gameLog };
    }
    
    // Check if player has Golem shield (unless bypassed by AOE or self-damage)
    if (!bypassGolem && player.golemHealth && player.golemHealth > 0) {
        player.golemHealth -= amount;
        gameLog.push(`${player.fullName}'s Golem absorbs ${amount} damage!`);
        
        if (player.golemHealth <= 0) {
            player.golemHealth = 0;
            gameLog.push(`${player.fullName}'s Golem is destroyed!`);
        } else {
            gameLog.push(`Golem has ${player.golemHealth} health remaining.`);
        }
        newPlayers[playerIndex] = player;
        return { players: newPlayers, log: gameLog };
    }
    
    player.health -= amount;
    
    // Summoned minion can't go below 1 HP on TT self-damage ONLY (not card effects)
    if (player.summonedBy && sourcePlayerName === 'self-inflicted') {
        player.health = Math.max(1, player.health);
        gameLog.push(`${player.fullName} (summoned) cannot die from self-damage, stays at 1 HP!`);
    } else {
        gameLog.push(`${player.fullName} takes ${amount} damage!`);
    }

    if (player.health <= 0) {
        const phoenixCardIndex = player.hand?.findIndex(c => c.id === 'phoenix_revive_8hp') ?? -1;

        if (phoenixCardIndex > -1) {
            player.health = 8;
            gameLog.push(`${player.fullName} rises from the ashes with 8 health!`);
            const phoenixCard = player.hand.splice(phoenixCardIndex, 1)[0];
            player.faceUpDiscards = [...(player.faceUpDiscards || []), phoenixCard];
        } else {
            player.health = 0;
            player.isAlive = false;
            gameLog.push(`${player.fullName} has been eliminated!`);

            // Kill summoned minion immediately when summoner dies
            newPlayers.forEach(p => {
                if (p.summonedBy === player.userId && p.isAlive) {
                    p.isAlive = false;
                    p.health = 0;
                    gameLog.push(`${p.fullName} dies as their summoner has fallen!`);
                }
            });
        }
    }
    
    newPlayers[playerIndex] = player;
    return { players: newPlayers, log: gameLog };
};

// Helper function to apply healing with proper caps
const processHealing = (players, playerId, amount, gameLog, canHealPast20 = false, sourceName = 'healing') => {
    const newPlayers = [...players];
    const playerIndex = newPlayers.findIndex(p => p.userId === playerId);
    if (playerIndex === -1 || amount <= 0) return { players: newPlayers, log: gameLog };

    let player = { ...newPlayers[playerIndex] };
    const oldHealth = player.health;
    
    if (canHealPast20) {
        player.health += amount;
    } else {
        player.health = Math.min(20, player.health + amount);
    }
    
    const actualHealing = player.health - oldHealth;
    if (actualHealing > 0) {
        gameLog.push(`${player.fullName} heals for ${actualHealing} health from ${sourceName}!`);
    }
    
    newPlayers[playerIndex] = player;
    return { players: newPlayers, log: gameLog };
};

export const applyGameAction = async (game, action) => {
    let newGame = JSON.parse(JSON.stringify(game));
    const { type, payload } = action;
    
    let gameLog = [...newGame.gameLog];
    const currentPlayer = newGame.players[newGame.currentPlayerIndex];
    const getPlayer = (id) => newGame.players.find(p => p.userId === id);

    // Auto-play logic for disconnected players (only if actually disconnected, not just inactive)
    const handleAutoPlay = () => {
        gameLog.push(`${currentPlayer.fullName} is inactive. Auto-playing turn.`);
        const rollResult = newGame.rollResult;

        if (!rollResult) {
            gameLog.push(`No roll result for inactive player. Passing turn.`);
            newGame.turnPhase = 'finished_turn';
            return;
        }

        if (rollResult.outcome === 'Self-Hit') {
            const { players, log } = processDamage(newGame.players, currentPlayer.userId, rollResult.die, gameLog, 'self-inflicted');
            newGame.players = players;
            gameLog = log;
            newGame.turnPhase = 'finished_turn';
        } else if (rollResult.outcome === 'Attack') {
            const potentialTargets = newGame.players.filter(p => p.isAlive && p.userId !== currentPlayer.userId && !p.isDisconnected && !p.ghostState?.active);
            if (potentialTargets.length > 0) {
                const target = potentialTargets.reduce((prev, curr) => curr.health > prev.health ? curr : prev);
                newGame.targetId = target.userId;
                newGame.attackerId = currentPlayer.userId;
                newGame.reactingPlayerId = target.userId;
                newGame.turnPhase = 'reaction';
                gameLog.push(`${currentPlayer.fullName} automatically targets ${target.fullName} for ${rollResult.die} damage.`);
            } else {
                gameLog.push(`No valid targets for ${currentPlayer.fullName}. Passing turn.`);
                newGame.turnPhase = 'finished_turn';
            }
        } else {
            gameLog.push(`${currentPlayer.fullName} automatically passes.`);
            newGame.turnPhase = 'finished_turn';
        }
    };

    // If current player is disconnected and it's their turn to act, auto-play
    // For SELECT_TARGET, we immediately auto-play and return.
    // For ROLL_DICE, we let the roll happen, then handle auto-play within the ROLL_DICE case.
    if (currentPlayer?.isDisconnected && type === 'SELECT_TARGET') {
        handleAutoPlay();
        newGame.gameLog = gameLog;
        newGame.lastActionTimestamp = new Date().toISOString();
        return newGame;
    }


    // Handle special states before rolling
    if (type === 'ROLL_DICE') {
        // Ghost loses 1 HP at turn start
        if (currentPlayer.ghostState?.active) {
            let result = processDamage(newGame.players, currentPlayer.userId, 1, gameLog, 'ghost curse');
            newGame.players = result.players;
            gameLog = result.log;
        }
        
        // Cleric heals 1 HP at turn start
        if (currentPlayer.clericHealMode) {
            let result = processHealing(newGame.players, currentPlayer.userId, 1, gameLog, false, 'Cleric healing');
            newGame.players = result.players;
            gameLog = result.log;
        }
        
        // Summoned minion can't attack summoner
        if (currentPlayer.summonedBy) {
            newGame.summonerProtection = currentPlayer.summonedBy;
        }
    }

    switch (type) {
        case 'ROLL_DICE': {
            const coin1 = Math.random() < 0.5 ? 'Heads' : 'Tails';
            const coin2 = Math.random() < 0.5 ? 'Heads' : 'Tails';
            const die = Math.floor(Math.random() * 8) + 1;
            
            let outcome;
            if (coin1 === 'Heads' && coin2 === 'Heads') outcome = 'Attack';
            else if (coin1 === 'Tails' && coin2 === 'Tails') outcome = 'Self-Hit';
            else outcome = 'Pass';
            
            // Check Witch curse - flips Attack to Self-Hit
            if (currentPlayer.cursedByWitch && outcome === 'Attack') {
                outcome = 'Self-Hit';
                currentPlayer.cursedByWitch = false;
                gameLog.push(`${currentPlayer.fullName}'s curse activates! Attack becomes Self-Hit!`);
            }
            
            // Check Cleric heal mode - forced exit on 2 heads
            if (currentPlayer.clericHealMode && outcome === 'Attack') {
                currentPlayer.clericHealMode = false;
                gameLog.push(`${currentPlayer.fullName} exits Cleric heal mode (cannot stay).`);
                newGame.turnPhase = 'finished_turn';
                break;
            }
            
            newGame.rollResult = { outcome, die, coins: [coin1, coin2] };
            gameLog.push(`${currentPlayer.fullName} rolls ${coin1}/${coin2} with D${die} = ${outcome}`);
            
            if (currentPlayer.isDisconnected) {
                handleAutoPlay();
            } else if (outcome === 'Attack') {
                newGame.turnPhase = 'target_selection';
            } else if (outcome === 'Self-Hit') {
                newGame.turnPhase = 'reaction';
                newGame.reactingPlayerId = currentPlayer.userId;
            } else { // Pass
                // Unholy can attack on Pass
                if (currentPlayer.hand?.some(c => c.id === 'unholy_ht_attack_opt')) {
                    newGame.turnPhase = 'target_selection';
                    gameLog.push(`${currentPlayer.fullName} can use Unholy to attack!`);
                } else {
                    newGame.turnPhase = 'finished_turn';
                }
            }
            break;
        }

        case 'SELECT_TARGET': {
            const { targetId } = payload;
            const target = getPlayer(targetId);

            if (target?.isDisconnected) {
                gameLog.push(`${target.fullName} is disconnected and cannot be targeted.`);
                break; 
            }
            
            if (target?.ghostState?.active) {
                gameLog.push(`Cannot target ${target.fullName} - they are in ghost form!`);
                break;
            }
            
            // Check if target has Golem
            if (target.golemHealth && target.golemHealth > 0) {
                const damage = newGame.rollResult.die;
                target.golemHealth -= damage;
                gameLog.push(`${currentPlayer.fullName} attacks ${target.fullName}'s Golem for ${damage} damage!`);
                
                if (target.golemHealth <= 0) {
                    target.golemHealth = 0;
                    gameLog.push(`${target.fullName}'s Golem is destroyed!`);
                } else {
                    gameLog.push(`Golem has ${target.golemHealth} health remaining.`);
                }
                
                newGame.turnPhase = 'finished_turn';
                break;
            }
            
            // Prevent summoned from attacking summoner
            if (newGame.summonerProtection && targetId === newGame.summonerProtection) {
                gameLog.push(`${currentPlayer.fullName} cannot attack their summoner!`);
                break;
            }
            
            newGame.targetId = targetId;
            newGame.attackerId = currentPlayer.userId;
            newGame.reactingPlayerId = targetId;
            newGame.turnPhase = 'reaction';
            newGame.redirectedByElf = false; // Reset elf redirect flag
            gameLog.push(`${currentPlayer.fullName} targets ${target.fullName} for ${newGame.rollResult.die} damage!`);
            break;
        }

        // The AUTO_HANDLE_DISCONNECTED case is removed as its logic is now integrated.

        case 'PLAY_CARD': {
            const { playerId, cardId, targetId } = payload;
            const player = getPlayer(playerId);
            const cardIndex = player.hand.findIndex(c => c.id === cardId);
            if (cardIndex === -1) break;
            
            const card = player.hand.splice(cardIndex, 1)[0];
            player.faceUpDiscards = [...(player.faceUpDiscards || []), card];
            gameLog.push(`${player.fullName} plays ${card.name}!`);

            const roll = newGame.rollResult?.die || 0;

            switch (card.id) {
                case 'warrior_steal_roll': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target?.isDisconnected) {
                             gameLog.push(`Cannot target a disconnected player with ${card.name}.`);
                             player.hand.push(card); // Return card to hand
                             player.faceUpDiscards.pop(); // Remove from face up discards
                             break;
                        }
                        gameLog.push(`${player.fullName} redirects the damage to ${target.fullName}!`);
                        newGame.targetId = targetId; // Make it clear who is being hit by this card effect
                        newGame.attackerId = playerId; // The player who played the card is the "attacker" for this effect
                        let result = processDamage(newGame.players, targetId, roll, gameLog, 'Warrior');
                        newGame.players = result.players;
                        gameLog = result.log;
                    } else {
                        gameLog.push(`${player.fullName} played Warrior, but no target was selected. Card discarded without effect.`);
                    }
                    break;
                }

                case 'paladin_heal_roll': {
                    // Actually heal the paladin player
                    let result = processHealing(newGame.players, playerId, roll, gameLog, false, 'Paladin');
                    newGame.players = result.players;
                    gameLog = result.log;
                    break;
                }

                case 'necromancer_split_half_roll': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target?.isDisconnected) {
                             gameLog.push(`Cannot target a disconnected player with ${card.name}.`);
                             player.hand.push(card); // Return card to hand
                             player.faceUpDiscards.pop(); // Remove from face up discards
                             break;
                        }
                        
                        // Ghosts cannot be targeted by Necromancer's effect
                        if (target?.ghostState?.active) {
                            gameLog.push(`Necromancer cannot target ${target.fullName} - they are in ghost form!`);
                            player.faceUpDiscards.pop();
                            player.hand.push(card);
                            break;
                        }

                        const damage = getHalfDamageRounded(roll);
                        
                        // Get target health BEFORE damage
                        const targetBefore = newGame.players.find(p => p.userId === targetId);
                        const healthBefore = targetBefore.health;
                        
                        // Deal damage (may be blocked by Golem)
                        let result = processDamage(newGame.players, targetId, damage, gameLog, 'Necromancer');
                        newGame.players = result.players;
                        gameLog = result.log;
                        
                        // Check actual health damage dealt
                        const targetAfter = newGame.players.find(p => p.userId === targetId);
                        const actualHealthLost = healthBefore - targetAfter.health;
                        
                        // Only heal for actual health damage dealt (not Golem damage)
                        if (actualHealthLost > 0) {
                            let healResult = processHealing(newGame.players, playerId, actualHealthLost, gameLog, false, 'stolen life');
                            newGame.players = healResult.players;
                            gameLog = healResult.log;
                        }
                    } else {
                        gameLog.push(`${player.fullName} played Necromancer, but no target was selected. Card discarded without effect.`);
                    }
                    break;
                }

                case 'elf_redirect_hh': {
                    if (targetId && newGame.rollResult?.outcome === 'Attack') {
                        const redirectTarget = getPlayer(targetId);
                        if (redirectTarget?.isDisconnected || redirectTarget?.ghostState?.active) {
                             gameLog.push(`Cannot redirect attack to invalid target.`);
                             player.hand.push(card);
                             player.faceUpDiscards.pop();
                             break;
                        }

                        gameLog.push(`${player.fullName} redirects the attack to ${redirectTarget.fullName}!`);
                        newGame.targetId = targetId;
                        newGame.redirectedByElf = true; // Prevent chain redirects
                        // Give redirected target a chance to react (they become the new reacting player)
                        newGame.reactingPlayerId = targetId;
                        newGame.turnPhase = 'reaction';
                    } else {
                        gameLog.push(`${player.fullName} played Elf, but conditions were not met. Card discarded.`);
                    }
                    break;
                }

                case 'dwarf_double_damage_win': {
                    const attacker = getPlayer(newGame.attackerId);
                    if (!attacker) {
                         gameLog.push(`${player.fullName} played Dwarf, but no clear attacker was identified. Card discarded without effect.`);
                         break;
                    }
                    gameLog.push(`Both ${player.fullName} and ${attacker.fullName} take ${roll} damage!`);
                    
                    let result1 = processDamage(newGame.players, player.userId, roll, gameLog, 'Dwarf card effect');
                    let result2 = processDamage(result1.players, attacker.userId, roll, result1.log, 'Dwarf card effect');
                    
                    newGame.players = result2.players;
                    gameLog = result2.log;
                    
                    // Check Dwarf win condition: if both die and are last 2 standing, Dwarf wins
                    const updatedPlayer = newGame.players.find(p => p.userId === player.userId);
                    const updatedAttacker = newGame.players.find(p => p.userId === attacker.userId);
                    if (!updatedPlayer.isAlive && !updatedAttacker.isAlive) {
                        const stillAlive = newGame.players.filter(p => p.isAlive);
                        if (stillAlive.length === 0) {
                            newGame.status = 'finished';
                            newGame.winner = { userId: player.userId, fullName: player.fullName };
                            gameLog.push(`${player.fullName} wins via Dwarf's last stand!`);
                        }
                    }
                    break;
                }

                case 'human_total_negate': {
                    gameLog.push(`${player.fullName} negates all damage!`);
                    break;
                }

                case 'demon_hh_heal_xfer': {
                    if (targetId && newGame.rollResult?.outcome === 'Attack') {
                        const target = getPlayer(targetId);
                        if (target?.isDisconnected || target?.ghostState?.active) {
                            gameLog.push(`Cannot use Demon on an invalid target.`);
                            player.hand.push(card);
                            player.faceUpDiscards.pop();
                            break;
                        }
                        
                        // Get target health BEFORE damage
                        const targetBefore = newGame.players.find(p => p.userId === targetId);
                        const healthBefore = targetBefore.health;
                        
                        // Deal damage first (may be blocked by Golem)
                        let damageResult = processDamage(newGame.players, targetId, roll, gameLog, 'Demon');
                        newGame.players = damageResult.players;
                        gameLog = damageResult.log;
                        
                        // Check actual health damage dealt
                        const targetAfter = newGame.players.find(p => p.userId === targetId);
                        const actualHealthLost = healthBefore - targetAfter.health;
                        
                        // Demon heals for actual health damage dealt (can go past 20)
                        if (actualHealthLost > 0) {
                            let healResult = processHealing(newGame.players, playerId, actualHealthLost, gameLog, true, 'demonic power');
                            newGame.players = healResult.players;
                            gameLog = healResult.log;
                        }
                        
                        // Transfer demon card only if target took health damage
                        if (targetAfter && targetAfter.isAlive && actualHealthLost > 0) {
                            targetAfter.hand.push(card);
                            player.faceUpDiscards.pop();
                            gameLog.push(`The Demon card transfers to ${targetAfter.fullName}!`);
                        } else if (actualHealthLost === 0) {
                            gameLog.push(`The Demon's power was blocked - no transfer!`);
                        }
                    }
                    break;
                }

                case 'knight_half_damage_even_up': {
                    const damage = roll % 2 !== 0 ? roll + 1 : roll;
                    let result = processDamage(newGame.players, playerId, damage, gameLog, 'Knight (evened up)');
                    newGame.players = result.players;
                    gameLog = result.log;
                    break;
                }

                case 'griffon_half_damage_evenup': {
                    const damage = roll % 2 !== 0 ? roll + 1 : roll;
                    let result = processDamage(newGame.players, playerId, damage, gameLog, 'Griffon (evened up)');
                    newGame.players = result.players;
                    gameLog = result.log;
                    break;
                }

                case 'mage_reroll_tt': {
                    gameLog.push(`${player.fullName} uses Mage to re-roll!`);
                    newGame.turnPhase = 'rolling';
                    newGame.rollResult = null;
                    newGame.reactingPlayerId = null;
                    break;
                }

                case 'troll_split_half_evenup': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target?.isDisconnected || target?.ghostState?.active) {
                            gameLog.push(`Cannot use Troll on invalid target.`);
                            player.hand.push(card);
                            player.faceUpDiscards.pop();
                            break;
                        }
                        
                        const halfDamage = getHalfDamageRounded(roll);
                        gameLog.push(`${player.fullName} splits damage with Troll!`);
                        
                        let result1 = processDamage(newGame.players, playerId, halfDamage, gameLog, 'Troll (self)');
                        let result2 = processDamage(result1.players, targetId, halfDamage, result1.log, 'Troll (shared)');
                        
                        newGame.players = result2.players;
                        gameLog = result2.log;
                    }
                    break;
                }

                case 'ghost_tt_persist': {
                    if (!player.ghostState?.active) {
                        gameLog.push(`${player.fullName} becomes a ghost!`);
                        player.ghostState = { active: true, turnsRemaining: 999 };
                        player.cursedByWitch = false; // Clear curse when entering ghost mode
                    } else {
                        // Exit ghost form, return to living WITHOUT taking damage
                        gameLog.push(`${player.fullName} returns to mortal form!`);
                        player.ghostState = { active: false, turnsRemaining: 0 };
                    }
                    break;
                }
                
                case 'ghost_stay': {
                    // Stay in ghost form, take the TT damage
                    gameLog.push(`${player.fullName} stays as a ghost and takes the damage!`);
                    let result = processDamage(newGame.players, playerId, roll, gameLog, 'ghost penalty', true);
                    newGame.players = result.players;
                    gameLog = result.log;
                    break;
                }

                case 'summoner_raise_dead': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target && !target.isAlive) {
                            target.isAlive = true;
                            target.health = roll;
                            target.summonedBy = playerId;
                            target.hand = []; // Minions can't use cards from before death
                            target.faceUpDiscards = []; // Clear discards too
                            gameLog.push(`${player.fullName} raises ${target.fullName} with ${roll} health!`);
                        }
                    }
                    break;
                }

                case 'thief_tt_halfdmg_steal': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target?.isDisconnected || target?.ghostState?.active || !target.hand || target.hand.length === 0) {
                            gameLog.push(`Cannot steal from invalid target.`);
                            player.hand.push(card);
                            player.faceUpDiscards.pop();
                            break;
                        }
                        
                        const halfDamage = getHalfDamageRounded(roll);
                        let result = processDamage(newGame.players, playerId, halfDamage, gameLog, 'Thief (self)');
                        newGame.players = result.players;
                        gameLog = result.log;
                        
                        const updatedTarget = newGame.players.find(p => p.userId === targetId);
                        if (updatedTarget.hand.length > 0) {
                            const randomIndex = Math.floor(Math.random() * updatedTarget.hand.length);
                            const stolenCard = updatedTarget.hand.splice(randomIndex, 1)[0];
                            player.hand.push(stolenCard);
                            gameLog.push(`${player.fullName} steals a card from ${updatedTarget.fullName}!`);
                        }
                    }
                    break;
                }

                case 'dragon_hh_aoe_shot': {
                    const halfDamage = getHalfDamageRounded(roll);
                    gameLog.push(`${player.fullName} unleashes Dragon's breath on all enemies!`);
                    
                    let updatedPlayers = newGame.players;
                    let updatedLog = gameLog;
                    
                    newGame.players.forEach(p => {
                        if (p.userId !== playerId && p.isAlive && !p.isDisconnected) {
                            let result = processDamage(updatedPlayers, p.userId, halfDamage, updatedLog, 'Dragon AOE');
                            updatedPlayers = result.players;
                            updatedLog = result.log;
                        }
                    });
                    
                    newGame.players = updatedPlayers;
                    gameLog = updatedLog;
                    gameLog.push(`All enemies must take a shot (Dragon's choice)!`);
                    break;
                }

                case 'giant_hh_aoe_full': {
                    gameLog.push(`${player.fullName} unleashes Giant's fury!`);
                    
                    let updatedPlayers = newGame.players;
                    let updatedLog = gameLog;
                    
                    newGame.players.forEach(p => {
                        if (p.userId !== playerId && p.isAlive && !p.isDisconnected) {
                            let result = processDamage(updatedPlayers, p.userId, roll, updatedLog, 'Giant AOE');
                            updatedPlayers = result.players;
                            updatedLog = result.log;
                        }
                    });
                    
                    newGame.players = updatedPlayers;
                    gameLog = updatedLog;
                    break;
                }

                case 'unholy_ht_attack_opt': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target?.isDisconnected || target?.ghostState?.active) {
                            gameLog.push(`Cannot use Unholy on invalid target.`);
                            player.hand.push(card);
                            player.faceUpDiscards.pop();
                            break;
                        }

                        gameLog.push(`${player.fullName} uses Unholy to attack on a Pass!`);
                        let result1 = processDamage(newGame.players, targetId, roll, gameLog, 'Unholy attack');
                        let result2 = processDamage(result1.players, playerId, 2, result1.log, 'Unholy self-damage', true);

                        newGame.players = result2.players;
                        gameLog = result2.log;
                    }
                    break;
                }

                case 'witch_tt_curse': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target && target.isAlive) {
                            target.cursedByWitch = true;
                            gameLog.push(`${player.fullName} curses ${target.fullName}!`);
                        }
                    }
                    let result = processDamage(newGame.players, playerId, roll, gameLog, 'Witch cost');
                    newGame.players = result.players;
                    gameLog = result.log;
                    break;
                }

                case 'cleric_hh_heal_mode': {
                    if (!player.clericHealMode) {
                        gameLog.push(`${player.fullName} enters Cleric heal mode!`);
                        player.clericHealMode = true;
                    } else {
                        gameLog.push(`${player.fullName} exits Cleric heal mode.`);
                        player.clericHealMode = false;
                    }
                    break;
                }

                case 'golum_hh_guardian': {
                    gameLog.push(`${player.fullName} creates a Golem guardian!`);
                    player.golemHealth = 8;
                    break;
                }

                case 'enchantress_tt_shared': {
                    if (targetId) {
                        const target = getPlayer(targetId);
                        if (target?.isDisconnected || target?.ghostState?.active) {
                            gameLog.push(`Cannot use Enchantress on invalid target.`);
                            player.hand.push(card);
                            player.faceUpDiscards.pop();
                            break;
                        }
                        
                        gameLog.push(`${player.fullName} shares fate with ${target.fullName}!`);
                        let result1 = processDamage(newGame.players, playerId, roll, gameLog, 'Enchantress');
                        let result2 = processDamage(result1.players, targetId, roll, result1.log, 'Enchantress');
                        
                        newGame.players = result2.players;
                        gameLog = result2.log;
                        
                        // Check Enchantress win condition
                        const updatedPlayer = newGame.players.find(p => p.userId === playerId);
                        const updatedTarget = newGame.players.find(p => p.userId === targetId);
                        if (!updatedPlayer.isAlive && !updatedTarget.isAlive) {
                            const stillAlive = newGame.players.filter(p => p.isAlive);
                            if (stillAlive.length === 0) {
                                newGame.status = 'finished';
                                newGame.winner = { userId: playerId, fullName: player.fullName };
                                gameLog.push(`${player.fullName} wins via Enchantress's destiny!`);
                            }
                        }
                    }
                    break;
                }

                default:
                    gameLog.push(`${card.name} effect not implemented yet.`);
                    break;
            }
            
            // Handle turn phase after card play
            if (card.id === 'mage_reroll_tt') {
                // Mage re-rolls, don't end turn
            } else {
                newGame.turnPhase = 'finished_turn';
                newGame.reactingPlayerId = null;
                newGame.targetId = null;
                newGame.attackerId = null;
                newGame.redirectedByElf = false;
            }
            break;
        }

        case 'DRINK_AND_PASS': {
            const { playerId } = payload;
            const damage = newGame.rollResult.die;
            
            const { players, log } = processDamage(newGame.players, playerId, damage, gameLog, 'self-inflicted');
            newGame.players = players;
            gameLog = log;
            
            newGame.turnPhase = 'finished_turn';
            newGame.reactingPlayerId = null;
            newGame.targetId = null;
            newGame.attackerId = null;
            break;
        }

        case 'END_TURN': {
            // Check for winner
            const alivePlayers = newGame.players.filter(p => p.isAlive);
            if (alivePlayers.length <= 1) {
                newGame.status = 'finished';
                const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
                newGame.winner = winner ? { userId: winner.userId, fullName: winner.fullName } : { userId: 'draw', fullName: 'Draw' };
                gameLog.push(winner ? `${winner.fullName} wins the game!` : `Game ends in a draw!`);
            } else {
                // Find next alive player that is NOT disconnected
                let nextIndex = (newGame.currentPlayerIndex + 1) % newGame.players.length;
                let attempts = 0;
                // Loop to find the next active player. Max attempts to prevent infinite loop if all players are dead/disconnected.
                while ((!newGame.players[nextIndex].isAlive || newGame.players[nextIndex].isDisconnected) && attempts < newGame.players.length * 2) {
                    // If the player is disconnected but alive, we mark their turn as auto-played and move on.
                    if (newGame.players[nextIndex].isDisconnected && newGame.players[nextIndex].isAlive) {
                         gameLog.push(`${newGame.players[nextIndex].fullName}'s turn is skipped as they are disconnected.`);
                    }
                    nextIndex = (nextIndex + 1) % newGame.players.length;
                    attempts++;
                }
                
                // If after all attempts we still land on a disconnected/dead player, it means something went wrong or no valid players left.
                // In a well-structured game, this loop should find an active player or the game would have ended.
                if (!newGame.players[nextIndex].isAlive || newGame.players[nextIndex].isDisconnected) {
                    // This implies no valid next player could be found (e.g., all remaining are disconnected, but game not ended)
                    // For robustness, force game end or default to the next player even if disconnected
                    // For now, let's assume the earlier `alivePlayers.length <= 1` check handles end game correctly.
                    // If we reach here, it means nextIndex is a valid player index but they are either dead or disconnected
                    // and the loop exited due to `attempts` limit, or there's only one player left who is also disconnected.
                    // If `alivePlayers.length` was > 1, then this state should ideally not be reached if there's at least one non-disconnected, alive player.
                    // Assuming the game ending condition is robust. If not, this is a fallback.
                }

                newGame.currentPlayerIndex = nextIndex;
                newGame.turnPhase = 'rolling';
                newGame.rollResult = null;
                newGame.attackerId = null;
                newGame.targetId = null;
                newGame.reactingPlayerId = null;
                newGame.redirectedByElf = false;
                newGame.summonerProtection = null;
                
                gameLog.push(`${newGame.players[nextIndex].fullName}'s turn.`);
            }
            break;
        }
    }

    newGame.gameLog = gameLog;
    newGame.lastActionTimestamp = new Date().toISOString();
    return newGame;
};