const { getCurrentWindow, getCurrentWebContents } = require("electron").remote
const path = require("path")
const fs = require("fs")
const Promise = require("bluebird")

// stage one
// prelaunch adjustments
const DI = {
  get conf() {
    const conf = fs.existsSync(path.join(__dirname, "..", "config.json"))
      ? require(path.join(__dirname, "..", "config.json"))
      : {}
    return conf
  },

  get package() {
    return require("../package.json")
  },

  get version() {
    return this.package.version
  }
}

Object.defineProperty(DI, "localStorage", {
  writable: false,
  value: require("./localStorage")
})

Object.defineProperty(DI, "client", {
  writable: false,
  value: (require("./client"))(DI)
})

Object.defineProperty(DI, "plugins", {
  writable: false,
  value: new (require("./pluginManager"))(DI)
})

// stage two
// post launch patching
process.once("loaded", async () => {
  window.include = (file, ...args) => {
    return require(path.resolve(__dirname, "..", file), ...args)
  }

  const ready = new Promise(rs => getCurrentWebContents().on("dom-ready", rs))

  // add core modules
  await DI.plugins.loadByPath(path.join(__dirname, "plugins", "react"), true)
  await DI.plugins.loadByPath(path.join(__dirname, "plugins", "settings"), true)
  await DI.plugins.loadByPath(path.join(__dirname, "plugins", "commands"), true)
  await DI.plugins.loadByPath(path.join(__dirname, "plugins", "changelog"))
  await DI.plugins.loadByPath(path.join(__dirname, "plugins", "css"), true)

  // add external modules
  await DI.plugins.loadPluginPath()

  ready.then(() => DI.plugins.ready())
})
