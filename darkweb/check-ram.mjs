#!/usr/bin/env node
// check-ram.mjs — Bitburner in-game RAM estimator
// Replicates the game's RamCalculations.ts algorithm using acorn-walk.
//
// Usage: node darkweb/check-ram.mjs [file.js ...]
//        node darkweb/check-ram.mjs --all       (scan all .js in darkweb/)
//        node darkweb/check-ram.mjs --bn4        (SF4-3 / in-BN4 singularity costs)
//        node darkweb/check-ram.mjs --sf4-2      (SF4-2: 4× singularity costs)

import { readFileSync, readdirSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const req = createRequire(import.meta.url);

// Load acorn and acorn-walk — try local first, fall back to bundled copies
let acorn, walk;
try { acorn = req("acorn"); } catch {
  acorn = req("/opt/node22/lib/node_modules/eslint/node_modules/acorn/dist/acorn.js");
}
try { walk = req("acorn-walk"); } catch {
  walk = req("/opt/node22/lib/node_modules/ts-node/node_modules/acorn-walk/dist/walk.js");
}

// ── RamCosts table (source-exact from RamCostGenerator.ts) ────────────────────
// sf4Level: 0 or 1 = outside BN4 no/low SF4 (×16), 2 = SF4-2 (×4), 3+ = base cost
const makeRamCosts = (sf4Level = 0) => {
  const sf4 = (cost) => sf4Level >= 3 ? cost : sf4Level === 2 ? cost * 4 : cost * 16;

  return {
    corporation: { hasCorporation:0, canCreateCorporation:0, createCorporation:20, hasUnlock:10, getUnlockCost:10, getUpgradeLevel:10, getUpgradeLevelCost:10, getConstants:0, getIndustryData:10, getMaterialData:10, acceptInvestmentOffer:20, goPublic:20, bribe:20, getCorporation:10, getDivision:10, expandIndustry:20, expandCity:20, purchaseUnlock:20, levelUpgrade:20, issueDividends:20, issueNewShares:20, buyBackShares:20, sellShares:20, getBonusTime:0, nextUpdate:0, sellDivision:20, getInvestmentOffer:10, sellMaterial:20, sellProduct:20, discontinueProduct:20, setSmartSupply:20, setSmartSupplyOption:20, buyMaterial:20, bulkPurchase:20, getWarehouse:10, getProduct:10, getMaterial:10, setMaterialMarketTA1:20, setMaterialMarketTA2:20, setProductMarketTA1:20, setProductMarketTA2:20, exportMaterial:20, cancelExportMaterial:20, purchaseWarehouse:20, upgradeWarehouse:20, makeProduct:20, limitMaterialProduction:20, limitProductProduction:20, getUpgradeWarehouseCost:10, hasWarehouse:10, hireEmployee:20, upgradeOfficeSize:20, throwParty:20, buyTea:20, hireAdVert:20, research:20, getOffice:10, getHireAdVertCost:10, getHireAdVertCount:10, getResearchCost:10, hasResearched:10, setJobAssignment:20, getOfficeSizeUpgradeCost:10 },
    hacknet: { numNodes:0.5, purchaseNode:0.5, getPurchaseNodeCost:0.5, getNodeStats:0.5, upgradeLevel:0.5, upgradeRam:0.5, upgradeCore:0.5, upgradeCache:0.5, getLevelUpgradeCost:0.5, getRamUpgradeCost:0.5, getCoreUpgradeCost:0.5, getCacheUpgradeCost:0.5, numHashes:0.5, hashCost:0.5, spendHashes:0.5, maxNumNodes:0.5, hashCapacity:0.5, getHashUpgrades:0.5, getHashUpgradeLevel:0.5, getStudyMult:0.5, getTrainingMult:0.5 },
    stock: { getConstants:0, hasWseAccount:0.05, hasTixApiAccess:0.05, has4SData:0.05, has4SDataTixApi:0.05, getBonusTime:0, nextUpdate:0, getSymbols:2, getPrice:2, getOrganization:2, getAskPrice:2, getBidPrice:2, getPosition:2, getMaxShares:2, getPurchaseCost:2, getSaleGain:2, buyStock:2.5, sellStock:2.5, buyShort:2.5, sellShort:2.5, placeOrder:2.5, cancelOrder:2.5, getOrders:2.5, getVolatility:2.5, getForecast:2.5, purchase4SMarketData:2.5, purchase4SMarketDataTixApi:2.5, purchaseWseAccount:2.5, purchaseTixApi:2.5 },
    singularity: { universityCourse:sf4(2), gymWorkout:sf4(2), travelToCity:sf4(2), goToLocation:sf4(5), purchaseTor:sf4(2), purchaseProgram:sf4(2), getCurrentServer:sf4(2), getCompanyPositionInfo:sf4(2), getCompanyPositions:sf4(2), cat:sf4(0.5), connect:sf4(2), manualHack:sf4(2), installBackdoor:sf4(2), getDarkwebProgramCost:sf4(0.5), getDarkwebPrograms:sf4(0.5), hospitalize:sf4(0.5), isBusy:sf4(0.5), stopAction:sf4(1), upgradeHomeRam:sf4(3), upgradeHomeCores:sf4(3), getUpgradeHomeRamCost:sf4(1.5), getUpgradeHomeCoresCost:sf4(1.5), workForCompany:sf4(3), applyToCompany:sf4(3), quitJob:sf4(3), getCompanyRep:sf4(1), getCompanyFavor:sf4(1), getCompanyFavorGain:sf4(0.75), getFactionInviteRequirements:sf4(3), getFactionEnemies:sf4(3), checkFactionInvitations:sf4(3), joinFaction:sf4(3), workForFaction:sf4(3), getFactionWorkTypes:sf4(1), getFactionRep:sf4(1), getFactionFavor:sf4(1), getFactionFavorGain:sf4(0.75), donateToFaction:sf4(5), createProgram:sf4(5), getHackingLevelRequirementOfProgram:sf4(5), commitCrime:sf4(5), getCrimeChance:sf4(5), getCrimeStats:sf4(5), getOwnedAugmentations:sf4(5), getOwnedSourceFiles:sf4(5), getAugmentationFactions:sf4(5), getAugmentationsFromFaction:sf4(5), getAugmentationPrereq:sf4(5), getAugmentationPrice:sf4(2.5), getAugmentationBasePrice:sf4(2.5), getAugmentationRepReq:sf4(2.5), getAugmentationStats:sf4(5), purchaseAugmentation:sf4(5), softReset:sf4(5), installAugmentations:sf4(5), isFocused:sf4(0.1), setFocus:sf4(0.1), getSaveData:sf4(1), exportGame:sf4(1), exportGameBonus:sf4(0.5), b1tflum3:sf4(16), destroyW0r1dD43m0n:sf4(32), getCurrentWork:sf4(0.5), getUnlockedAchievements:sf4(5) },
    format: { number:0, ram:0, percent:0, time:0, money:0 },
    cloud: { getServerLimit:0.05, getRamLimit:0.05, getServerCost:0.25, getServerUpgradeCost:0.1, getServerNames:1.05, upgradeServer:0.25, renameServer:0, purchaseServer:2.25, deleteServer:2.25 },
    gang: { createGang:1, inGang:0, getMemberNames:1, renameMember:0, getGangInformation:2, getAllGangInformation:2, getMemberInformation:2, canRecruitMember:1, getRecruitsAvailable:1, respectForNextRecruit:1, recruitMember:2, getTaskNames:0, getTaskStats:1, setMemberTask:2, getEquipmentNames:0, getEquipmentCost:2, getEquipmentType:2, getEquipmentStats:2, purchaseEquipment:4, ascendMember:4, getAscensionResult:2, getInstallResult:2, setTerritoryWarfare:2, getChanceToWinClash:4, getBonusTime:0, nextUpdate:0 },
    go: { makeMove:4, passTurn:0, getBoardState:4, getMoveHistory:0, getCurrentPlayer:0, getGameState:0, getOpponent:0, opponentNextTurn:0, resetBoardState:0, analysis:{ getValidMoves:8, getChains:16, getLiberties:16, getControlledEmptyNodes:16, getStats:0, resetStats:0, setTestingBoardState:4, highlightPoint:0, clearPointHighlight:0, clearAllPointHighlights:0 }, cheat:{ getCheatSuccessChance:1, getCheatCount:1, removeRouter:8, playTwoMoves:8, repairOfflineNode:8, destroyNode:8 } },
    dnet: { authenticate:0.4, connectToSession:0.05, heartbleed:0.6, openCache:2, probe:0.2, setStasisLink:12, getStasisLinkLimit:0, getStasisLinkedServers:0, getServer:2, getServerDetails:0.1, induceServerMigration:4, unleashStormSeed:0.1, isDarknetServer:0.1, memoryReallocation:1, getBlockedRam:0, getDepth:0.1, promoteStock:2, phishingAttack:2, getDarknetInstability:0, nextMutation:0, getServerRequiredCharismaLevel:0.1, labreport:0, labradar:0 },
    bladeburner: { inBladeburner:0, getContractNames:0, getOperationNames:0, getBlackOpNames:0, getNextBlackOp:2, getBlackOpRank:2, getGeneralActionNames:0, getSkillNames:0, startAction:4, stopBladeburnerAction:2, getCurrentAction:1, getActionTime:4, getActionCurrentTime:4, getActionEstimatedSuccessChance:4, getActionRepGain:4, getActionRankGain:4, getActionRankLoss:4, getActionCountRemaining:4, getActionMaxLevel:4, getActionCurrentLevel:4, getActionAutolevel:4, getActionSuccesses:4, setActionAutolevel:4, setActionLevel:4, getRank:4, getSkillPoints:4, getSkillLevel:4, getSkillUpgradeCost:4, upgradeSkill:4, getTeamSize:4, setTeamSize:4, getCityEstimatedPopulation:4, getCityCommunities:4, getCityChaos:4, getCity:4, switchCity:4, getStamina:4, joinBladeburnerFaction:4, joinBladeburnerDivision:4, getBonusTime:0, nextUpdate:0 },
    infiltration: { getPossibleLocations:0, getInfiltration:15 },
    codingcontract: { attempt:10, getContractType:5, getData:5, getContract:15, getDescription:5, getNumTriesRemaining:2, createDummyContract:2, getContractTypes:0 },
    sleeve: { getNumSleeves:4, setToIdle:4, setToShockRecovery:4, setToSynchronize:4, setToCommitCrime:4, setToUniversityCourse:4, travel:4, setToCompanyWork:4, setToFactionWork:4, setToGymWorkout:4, getTask:4, getSleeve:4, getSleeveAugmentations:4, getSleevePurchasableAugs:4, purchaseSleeveAug:4, setToBladeburnerAction:4, getSleeveAugmentationPrice:4, getSleeveAugmentationRepReq:4, purchaseSleeve:4, upgradeMemory:4, getSleeveCost:4, getMemoryUpgradeCost:4 },
    stanek: { giftWidth:0.4, giftHeight:0.4, chargeFragment:0.4, fragmentDefinitions:0, activeFragments:5, clearGift:0, canPlaceFragment:0.5, placeFragment:5, getFragment:2, removeFragment:0.15, acceptGift:2 },
    ui: { openTail:0, renderTail:0, moveTail:0, resizeTail:0, closeTail:0, setTailTitle:0, setTailFontSize:0, setTailMinimized:0, getTheme:0, setTheme:0, resetTheme:0, getStyles:0, setStyles:0, resetStyles:0, getGameInfo:0, clearTerminal:0, openCodeEditor:0, windowSize:0, alias:0, unalias:0, getAllAliases:0, renderPage:0 },
    grafting: { getAugmentationGraftPrice:3.75, getAugmentationGraftTime:3.75, getGraftableAugmentations:5, graftAugmentation:7.5, waitForOngoingGrafting:0 },

    sprintf:0, vsprintf:0, scan:0.2, hack:0.1, hackAnalyzeThreads:1, hackAnalyze:1, hackAnalyzeSecurity:1, hackAnalyzeChance:1, sleep:0, asleep:0, share:2.4, getSharePower:0.2, grow:0.15, growthAnalyze:1, growthAnalyzeSecurity:1, weaken:0.15, weakenAnalyze:1, print:0, printf:0, tprint:0, tprintf:0, clearLog:0, disableLog:0, enableLog:0, isLogEnabled:0, getScriptLogs:0, hasTorRouter:0.05, nuke:0.05, brutessh:0.05, ftpcrack:0.05, relaysmtp:0.05, httpworm:0.05, sqlinject:0.05, run:1.0, exec:1.3, spawn:2.0, self:0, kill:0.5, killall:0.5, exit:0, atExit:0, scp:0.6, ls:0.2, ps:0.2, getRecentScripts:0.2, hasRootAccess:0.05, getHostname:0.05, getIP:0.05, getHackingLevel:0.05, getHackingMultipliers:0.25, getHacknetMultipliers:0.25, getBitNodeMultipliers:4, getServer:2, getServerMoneyAvailable:0.1, getServerSecurityLevel:0.1, getServerBaseSecurityLevel:0.1, getServerMinSecurityLevel:0.1, getServerRequiredHackingLevel:0.1, getServerMaxMoney:0.1, getServerGrowth:0.1, getServerNumPortsRequired:0.1, getServerMaxRam:0.05, getServerUsedRam:0.05, dnsLookup:0.05, serverExists:0.1, fileExists:0.1, isRunning:0.1, write:0, tryWritePort:0, read:0, getFileMetadata:0, peek:0, clear:0, writePort:0, nextPortWrite:0, readPort:0, getPortHandle:0, rm:0.6, scriptRunning:1.0, scriptKill:1.0, getScriptName:0, getScriptRam:0.1, getHackTime:0.05, getGrowTime:0.05, getWeakenTime:0.05, getTotalScriptIncome:0.1, getScriptIncome:0.1, getTotalScriptExpGain:0.1, getScriptExpGain:0.1, getRunningScript:0.3, ramOverride:0, prompt:0, wget:0, getFavorToDonate:0.1, getPlayer:0.5, getMoneySources:1, mv:0, getResetInfo:1, getFunctionRamCost:0, toast:0, clearPort:0, openDevMenu:0, alert:0, flags:0, exploit:0, bypass:0, alterReality:0, rainbow:0, heart:{ break:0 }, tprintRaw:0, printRaw:0, dynamicImport:0,

    formulas: { mockServer:0, mockPlayer:0, mockPerson:0, reputation:{ calculateFavorToRep:0, calculateRepToFavor:0, repFromDonation:0 }, skills:{ calculateSkill:0, calculateExp:0 }, hacking:{ hackChance:0, hackExp:0, hackPercent:0, growPercent:0, growThreads:0, hackTime:0, growTime:0, weakenTime:0 }, work:{ crimeSuccessChance:0 } },
  };
};

// ── findFunc (exact replica of game's RamCalculations.ts algorithm) ─────────────
function findFunc(obj, ref, prefix = "") {
  for (const [key, value] of Object.entries(obj)) {
    if (key === ref && (typeof value === "number" || typeof value === "function")) {
      return { cost: typeof value === "function" ? value() : value, detail: `${prefix}${ref}` };
    }
    if (typeof value === "object" && value !== null) {
      const found = findFunc(value, ref, `${key}.`);
      if (found) return found;
    }
  }
  return undefined;
}

// ── RAM analysis ───────────────────────────────────────────────────────────────
function analyzeRam(src, RamCosts) {
  const BASE = 1.6;
  const loaded = new Set();
  const hits = new Map();

  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" });
  } catch (e) {
    return { error: `Parse error: ${e.message}`, total: 0, hits: [] };
  }

  // Check for ramOverride() as first statement in main()
  for (const node of ast.body) {
    const decl = (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration")
      ? node.declaration : node;
    if (decl?.type === "FunctionDeclaration" && decl.id?.name === "main") {
      const first = decl.body?.body?.[0];
      if (first?.type === "ExpressionStatement") {
        const expr = first.expression;
        if (expr?.type === "CallExpression" && expr.callee?.name === "ramOverride") {
          const val = expr.arguments?.[0]?.value;
          if (typeof val === "number") {
            return { total: val, hits: [{ id: "ramOverride", cost: val, detail: "ramOverride()" }], isOverride: true };
          }
        }
      }
    }
  }

  const addRef = (name) => {
    if (loaded.has(name)) return;
    const found = findFunc(RamCosts, name);
    if (found && found.cost > 0) {
      loaded.add(name);
      hits.set(name, found);
    }
  };

  // Custom base that walks MemberExpression property even when non-computed.
  // This matches the game's commonVisitors() MemberExpression handler exactly:
  //   node.object && walkDeeper(node.object, st);
  //   node.property && walkDeeper(node.property, st);
  const base = { ...walk.base };
  base.MemberExpression = (node, st, c) => {
    if (node.object) c(node.object, st, "Expression");
    if (node.property) c(node.property, st, "Expression");
  };

  walk.recursive(ast, null, {
    Identifier(node) { addRef(node.name); },
  }, base);

  const hitList = [...hits.entries()]
    .map(([id, { cost, detail }]) => ({ id, cost, detail }))
    .sort((a, b) => b.cost - a.cost);

  const total = BASE + hitList.reduce((s, h) => s + h.cost, 0);
  return { total, hits: hitList };
}

// ── Main ───────────────────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const sf4Level = rawArgs.includes("--bn4") ? 3 : rawArgs.includes("--sf4-2") ? 2 : rawArgs.includes("--sf4-1") ? 1 : 0;
const RamCosts = makeRamCosts(sf4Level);

let files = rawArgs.filter(a => !a.startsWith("--"));
if (rawArgs.includes("--all") || files.length === 0) {
  const dir = dirname(fileURLToPath(import.meta.url));
  files = readdirSync(dir)
    .filter(f => f.endsWith(".js"))
    .map(f => resolve(dir, f));
}

for (const f of files) {
  let src;
  try { src = readFileSync(f, "utf8"); } catch (e) { console.error(`Cannot read ${f}: ${e.message}`); continue; }

  const { total, hits, error, isOverride } = analyzeRam(src, RamCosts);
  const label = basename(f);
  const flag = total > 10 ? "  !! HIGH" : total > 5 ? "  ^ elevated" : "";

  if (error) { console.log(`${label}: ERROR — ${error}`); continue; }

  console.log(`\n${label}: ${total.toFixed(2)} GB${flag}`);
  if (isOverride) { console.log(`  ramOverride(${total}) active`); continue; }
  console.log(`  1.60 GB  base`);
  for (const h of hits) {
    console.log(`  +${h.cost.toFixed(2)} GB  ${h.id}  (${h.detail})`);
  }
  if (hits.length === 0) console.log(`  (no costed NS identifiers)`);
}

const sfLabel = sf4Level >= 3 ? "BN4/SF4-3+ (base cost)" : sf4Level === 2 ? "SF4-2 (4×)" : "no SF4 (16×)";
console.log(`\n${"─".repeat(50)}\n${files.length} file(s) | singularity multiplier: ${sfLabel}`);
