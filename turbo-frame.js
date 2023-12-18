import morphdom from "morphdom";

export default class TurboFrame extends window.HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", this.onClick.bind(this), false);
    this.addEventListener("submit", this.onSubmit.bind(this), false);
    if (this.getAttribute("src")) {
      this.load(this.getAttribute("src"));
    }
  }

  onClick(e) {
    if (e.target.nodeName == "A") {
      e.preventDefault();
      e.stopPropagation();
      this.visit(e.target.href);
    }
  }

  onSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("shub-niggurath");
  }

  async load(url) {
    const response = await fetch(url);
    if (response.status == 404) {
      return console.warn("URL '" + url + "' returns 404 Not Found!", this);
    }
    if (response.status == 301 || response.status == 302) {
      return this.load(response.url);
    }
    const markup = await response.text();
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    morphdom(this, dom.body);
  }

  async visit(url) {
    const response = await fetch(url);
    if (response.status == 301 || response.status == 302) {
      return this.visit(response.url);
    }
    const markup = await response.text();
    this.render(markup);
    window.requestAnimationFrame(window.Brutto.partialFireEvent("turbo:load"));
  }

  render(markup) {
    if (this.id == "") {
      console.warn("No id on turbo-frame element!", this);
      return false;
    }
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    morphdom(this, dom.getElementById(this.id));
  }

  loadSrc(src) {

  }
}
