import morphdom from "morphdom";
import Http from "./http.js";

export default class TurboFrame extends window.HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", this.onClick.bind(this), false);
    this.addEventListener("submit", this.onSubmit.bind(this), false);
    if (this.getAttribute("src")) {
      this.load(this.getAttribute("src"));
    }
  }

  async visit(url, method, stream) {
    const response = await this.getLinkResponse(url, method);
    const markup = await response.text();
    this.render(markup);
  }

  async submit(el, stream) {
    const response = await this.getFormResponse(el);
    const markup = await response.text();
    this.render(markup);
  }

  async load(url) {
    const response = await fetch(url);
    if (response.status == 404) {
      return console.warn("URL '" + url + "' returns 404 Not Found!", this);
    }
    if (response.redirected) {
      return this.load(response.url);
    }
    const markup = await response.text();
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    morphdom(this, dom.body);
  }

  render(markup) {
    if (this.id == "") {
      console.warn("No id on turbo-frame element!", this);
      return false;
    }
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    if (dom.getElementById(this.id) == null) {
      console.warn(`Turbo frame element with id ${this.id} not found in response!`, this);
      return;
    }
    morphdom(this, dom.getElementById(this.id));
  }

  afterSubmit(markup, url) {
    this.render(markup);
  }
}
Object.assign(TurboFrame.prototype, Http);
