module.exports = {
  version: "8.0.0",
  menu: async (kernel, info) => {
    return [{
      default: true,
      icon: "fa-solid fa-wave-square",
      text: "teai",
      href: "/asset/api/teai/index.html"
    }]
  }
}
