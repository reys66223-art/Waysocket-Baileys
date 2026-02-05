"use strict";

const chalk = require("chalk");

const clearConsole = () => {
  process.stdout.write(
    process.platform === "win32" ? "\x1B[2J\x1B[0f" : "\x1B[2J\x1B[3J\x1B[H"
  );
};

clearConsole();

console.log(chalk.cyanBright(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███████╗██╗     ███████╗ ██████╗████████╗██████╗ ██╗ ██████╗║
║   ██╔════╝██║     ██╔════╝██╔════╝╚══██╔══╝██╔══██╗██║██╔════╝║
║   █████╗  ██║     █████╗  ██║        ██║   ██████╔╝██║██║     ║
║   ██╔══╝  ██║     ██╔══╝  ██║        ██║   ██╔══██╗██║██║     ║
║   ███████╗███████╗███████╗╚██████╗   ██║   ██║  ██║██║╚██████╗║
║   ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝  ╚═╝╚═╝ ╚═════╝║
║                      ⚡ BLUE ⚡                                ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  `) + chalk.yellowBright(`💎 "Success is not final, failure is not fatal:`) + chalk.cyanBright(`    ║
║  `) + chalk.yellowBright(`    it is the courage to continue that counts."`) + chalk.cyanBright(`   ║
╠══════════════════════════════════════════════════════════════╣`) + chalk.greenBright(`
║  🔹 Project  : Waysocket Baileys (Electric Blue)             ║
║  🔹 Creator  : Electric Blue Team                            ║
║  🔹 Version  : 2.0 Stable                                    ║
║  🔹 Status   : ✅ Online & Ready                              ║`) + chalk.cyanBright(`
╚══════════════════════════════════════════════════════════════╝
`));

// ============================
// FIXED __createBinding
// ============================

var createBinding =
  (this && this.createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
      if (k2 === undefined) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);

      if (
        !desc ||
        (!("get" in desc) && (desc.writable || desc.configurable))
      ) {
        desc = {
          enumerable: true,
          get: function () {
            return m[k];
          },
        };
      }

      Object.defineProperty(o, k2, desc);
    }
    : function (o, m, k, k2) {
      if (k2 === undefined) k2 = k;
      o[k2] = m[k];
    });

var exportStar =
  (this && this.exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        createBinding(exports, m, p);
  };

var importDefault =
  (this && this.importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };

Object.defineProperty(exports, "__esModule", { value: true });

const Socket_1 = importDefault(require("./Socket"));

exports.makeWASocket = Socket_1.default;

exportStar(require("../WAProto"), exports);
exportStar(require("./Utils"), exports);
exportStar(require("./Types"), exports);
exportStar(require("./Store"), exports);
exportStar(require("./Defaults"), exports);
exportStar(require("./WABinary"), exports);
exportStar(require("./WAM"), exports);
exportStar(require("./WAUSync"), exports);

exports.default = Socket_1.default;
