"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seed script: reads drills.json and inserts into the syntax_drill table.
 *
 * Usage:
 *   npx tsx scripts/seed-drills.ts
 *
 * Requires DATABASE_URL in .env.local
 */
var dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: ".env.local" });
var fs_1 = require("fs");
var path_1 = require("path");
var postgres_1 = require("postgres");
var postgres_js_1 = require("drizzle-orm/postgres-js");
var schema_1 = require("../src/db/schema");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var jsonPath, items, client, db, _i, items_1, d;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    jsonPath = (0, path_1.resolve)(__dirname, "../drills.json");
                    items = JSON.parse((0, fs_1.readFileSync)(jsonPath, "utf-8"));
                    console.log("Seeding ".concat(items.length, " drills..."));
                    client = (0, postgres_1.default)(process.env.DATABASE_URL, { prepare: false });
                    db = (0, postgres_js_1.drizzle)(client);
                    _i = 0, items_1 = items;
                    _d.label = 1;
                case 1:
                    if (!(_i < items_1.length)) return [3 /*break*/, 4];
                    d = items_1[_i];
                    return [4 /*yield*/, db
                            .insert(schema_1.syntaxDrills)
                            .values({
                            title: d.title,
                            category: d.category,
                            level: d.level,
                            language: "python",
                            prompt: d.prompt,
                            expectedCode: d.expectedCode,
                            alternatives: d.alternatives,
                            explanation: d.explanation,
                            tags: d.tags,
                            promptVariants: (_a = d.promptVariants) !== null && _a !== void 0 ? _a : [],
                            testCases: (_b = d.testCases) !== null && _b !== void 0 ? _b : null,
                            distractors: (_c = d.distractors) !== null && _c !== void 0 ? _c : [],
                        })
                            .onConflictDoNothing()];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("\u2713 Seeded ".concat(items.length, " drills"));
                    return [4 /*yield*/, client.end()];
                case 5:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error("Drill seed failed:", err);
    process.exit(1);
});
