// node_modules/morphdom/dist/morphdom-esm.js
var DOCUMENT_FRAGMENT_NODE = 11;
function morphAttrs(fromNode, toNode) {
  var toNodeAttrs = toNode.attributes;
  var attr;
  var attrName;
  var attrNamespaceURI;
  var attrValue;
  var fromValue;
  if (toNode.nodeType === DOCUMENT_FRAGMENT_NODE || fromNode.nodeType === DOCUMENT_FRAGMENT_NODE) {
    return;
  }
  for (var i = toNodeAttrs.length - 1; i >= 0; i--) {
    attr = toNodeAttrs[i];
    attrName = attr.name;
    attrNamespaceURI = attr.namespaceURI;
    attrValue = attr.value;
    if (attrNamespaceURI) {
      attrName = attr.localName || attrName;
      fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);
      if (fromValue !== attrValue) {
        if (attr.prefix === "xmlns") {
          attrName = attr.name;
        }
        fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
      }
    } else {
      fromValue = fromNode.getAttribute(attrName);
      if (fromValue !== attrValue) {
        fromNode.setAttribute(attrName, attrValue);
      }
    }
  }
  var fromNodeAttrs = fromNode.attributes;
  for (var d = fromNodeAttrs.length - 1; d >= 0; d--) {
    attr = fromNodeAttrs[d];
    attrName = attr.name;
    attrNamespaceURI = attr.namespaceURI;
    if (attrNamespaceURI) {
      attrName = attr.localName || attrName;
      if (!toNode.hasAttributeNS(attrNamespaceURI, attrName)) {
        fromNode.removeAttributeNS(attrNamespaceURI, attrName);
      }
    } else {
      if (!toNode.hasAttribute(attrName)) {
        fromNode.removeAttribute(attrName);
      }
    }
  }
}
var range;
var NS_XHTML = "http://www.w3.org/1999/xhtml";
var doc = typeof document === "undefined" ? void 0 : document;
var HAS_TEMPLATE_SUPPORT = !!doc && "content" in doc.createElement("template");
var HAS_RANGE_SUPPORT = !!doc && doc.createRange && "createContextualFragment" in doc.createRange();
function createFragmentFromTemplate(str) {
  var template = doc.createElement("template");
  template.innerHTML = str;
  return template.content.childNodes[0];
}
function createFragmentFromRange(str) {
  if (!range) {
    range = doc.createRange();
    range.selectNode(doc.body);
  }
  var fragment = range.createContextualFragment(str);
  return fragment.childNodes[0];
}
function createFragmentFromWrap(str) {
  var fragment = doc.createElement("body");
  fragment.innerHTML = str;
  return fragment.childNodes[0];
}
function toElement(str) {
  str = str.trim();
  if (HAS_TEMPLATE_SUPPORT) {
    return createFragmentFromTemplate(str);
  } else if (HAS_RANGE_SUPPORT) {
    return createFragmentFromRange(str);
  }
  return createFragmentFromWrap(str);
}
function compareNodeNames(fromEl, toEl) {
  var fromNodeName = fromEl.nodeName;
  var toNodeName = toEl.nodeName;
  var fromCodeStart, toCodeStart;
  if (fromNodeName === toNodeName) {
    return true;
  }
  fromCodeStart = fromNodeName.charCodeAt(0);
  toCodeStart = toNodeName.charCodeAt(0);
  if (fromCodeStart <= 90 && toCodeStart >= 97) {
    return fromNodeName === toNodeName.toUpperCase();
  } else if (toCodeStart <= 90 && fromCodeStart >= 97) {
    return toNodeName === fromNodeName.toUpperCase();
  } else {
    return false;
  }
}
function createElementNS(name, namespaceURI) {
  return !namespaceURI || namespaceURI === NS_XHTML ? doc.createElement(name) : doc.createElementNS(namespaceURI, name);
}
function moveChildren(fromEl, toEl) {
  var curChild = fromEl.firstChild;
  while (curChild) {
    var nextChild = curChild.nextSibling;
    toEl.appendChild(curChild);
    curChild = nextChild;
  }
  return toEl;
}
function syncBooleanAttrProp(fromEl, toEl, name) {
  if (fromEl[name] !== toEl[name]) {
    fromEl[name] = toEl[name];
    if (fromEl[name]) {
      fromEl.setAttribute(name, "");
    } else {
      fromEl.removeAttribute(name);
    }
  }
}
var specialElHandlers = {
  OPTION: function(fromEl, toEl) {
    var parentNode = fromEl.parentNode;
    if (parentNode) {
      var parentName = parentNode.nodeName.toUpperCase();
      if (parentName === "OPTGROUP") {
        parentNode = parentNode.parentNode;
        parentName = parentNode && parentNode.nodeName.toUpperCase();
      }
      if (parentName === "SELECT" && !parentNode.hasAttribute("multiple")) {
        if (fromEl.hasAttribute("selected") && !toEl.selected) {
          fromEl.setAttribute("selected", "selected");
          fromEl.removeAttribute("selected");
        }
        parentNode.selectedIndex = -1;
      }
    }
    syncBooleanAttrProp(fromEl, toEl, "selected");
  },
  /**
   * The "value" attribute is special for the <input> element since it sets
   * the initial value. Changing the "value" attribute without changing the
   * "value" property will have no effect since it is only used to the set the
   * initial value.  Similar for the "checked" attribute, and "disabled".
   */
  INPUT: function(fromEl, toEl) {
    syncBooleanAttrProp(fromEl, toEl, "checked");
    syncBooleanAttrProp(fromEl, toEl, "disabled");
    if (fromEl.value !== toEl.value) {
      fromEl.value = toEl.value;
    }
    if (!toEl.hasAttribute("value")) {
      fromEl.removeAttribute("value");
    }
  },
  TEXTAREA: function(fromEl, toEl) {
    var newValue = toEl.value;
    if (fromEl.value !== newValue) {
      fromEl.value = newValue;
    }
    var firstChild = fromEl.firstChild;
    if (firstChild) {
      var oldValue = firstChild.nodeValue;
      if (oldValue == newValue || !newValue && oldValue == fromEl.placeholder) {
        return;
      }
      firstChild.nodeValue = newValue;
    }
  },
  SELECT: function(fromEl, toEl) {
    if (!toEl.hasAttribute("multiple")) {
      var selectedIndex = -1;
      var i = 0;
      var curChild = fromEl.firstChild;
      var optgroup;
      var nodeName;
      while (curChild) {
        nodeName = curChild.nodeName && curChild.nodeName.toUpperCase();
        if (nodeName === "OPTGROUP") {
          optgroup = curChild;
          curChild = optgroup.firstChild;
        } else {
          if (nodeName === "OPTION") {
            if (curChild.hasAttribute("selected")) {
              selectedIndex = i;
              break;
            }
            i++;
          }
          curChild = curChild.nextSibling;
          if (!curChild && optgroup) {
            curChild = optgroup.nextSibling;
            optgroup = null;
          }
        }
      }
      fromEl.selectedIndex = selectedIndex;
    }
  }
};
var ELEMENT_NODE = 1;
var DOCUMENT_FRAGMENT_NODE$1 = 11;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;
function noop() {
}
function defaultGetNodeKey(node) {
  if (node) {
    return node.getAttribute && node.getAttribute("id") || node.id;
  }
}
function morphdomFactory(morphAttrs2) {
  return function morphdom2(fromNode, toNode, options) {
    if (!options) {
      options = {};
    }
    if (typeof toNode === "string") {
      if (fromNode.nodeName === "#document" || fromNode.nodeName === "HTML" || fromNode.nodeName === "BODY") {
        var toNodeHtml = toNode;
        toNode = doc.createElement("html");
        toNode.innerHTML = toNodeHtml;
      } else {
        toNode = toElement(toNode);
      }
    } else if (toNode.nodeType === DOCUMENT_FRAGMENT_NODE$1) {
      toNode = toNode.firstElementChild;
    }
    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
    var onNodeAdded = options.onNodeAdded || noop;
    var onBeforeElUpdated = options.onBeforeElUpdated || noop;
    var onElUpdated = options.onElUpdated || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
    var skipFromChildren = options.skipFromChildren || noop;
    var addChild = options.addChild || function(parent, child) {
      return parent.appendChild(child);
    };
    var childrenOnly = options.childrenOnly === true;
    var fromNodesLookup = /* @__PURE__ */ Object.create(null);
    var keyedRemovalList = [];
    function addKeyedRemoval(key) {
      keyedRemovalList.push(key);
    }
    function walkDiscardedChildNodes(node, skipKeyedNodes) {
      if (node.nodeType === ELEMENT_NODE) {
        var curChild = node.firstChild;
        while (curChild) {
          var key = void 0;
          if (skipKeyedNodes && (key = getNodeKey(curChild))) {
            addKeyedRemoval(key);
          } else {
            onNodeDiscarded(curChild);
            if (curChild.firstChild) {
              walkDiscardedChildNodes(curChild, skipKeyedNodes);
            }
          }
          curChild = curChild.nextSibling;
        }
      }
    }
    function removeNode(node, parentNode, skipKeyedNodes) {
      if (onBeforeNodeDiscarded(node) === false) {
        return;
      }
      if (parentNode) {
        parentNode.removeChild(node);
      }
      onNodeDiscarded(node);
      walkDiscardedChildNodes(node, skipKeyedNodes);
    }
    function indexTree(node) {
      if (node.nodeType === ELEMENT_NODE || node.nodeType === DOCUMENT_FRAGMENT_NODE$1) {
        var curChild = node.firstChild;
        while (curChild) {
          var key = getNodeKey(curChild);
          if (key) {
            fromNodesLookup[key] = curChild;
          }
          indexTree(curChild);
          curChild = curChild.nextSibling;
        }
      }
    }
    indexTree(fromNode);
    function handleNodeAdded(el) {
      onNodeAdded(el);
      var curChild = el.firstChild;
      while (curChild) {
        var nextSibling = curChild.nextSibling;
        var key = getNodeKey(curChild);
        if (key) {
          var unmatchedFromEl = fromNodesLookup[key];
          if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
            curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
            morphEl(unmatchedFromEl, curChild);
          } else {
            handleNodeAdded(curChild);
          }
        } else {
          handleNodeAdded(curChild);
        }
        curChild = nextSibling;
      }
    }
    function cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey) {
      while (curFromNodeChild) {
        var fromNextSibling = curFromNodeChild.nextSibling;
        if (curFromNodeKey = getNodeKey(curFromNodeChild)) {
          addKeyedRemoval(curFromNodeKey);
        } else {
          removeNode(
            curFromNodeChild,
            fromEl,
            true
            /* skip keyed nodes */
          );
        }
        curFromNodeChild = fromNextSibling;
      }
    }
    function morphEl(fromEl, toEl, childrenOnly2) {
      var toElKey = getNodeKey(toEl);
      if (toElKey) {
        delete fromNodesLookup[toElKey];
      }
      if (!childrenOnly2) {
        if (onBeforeElUpdated(fromEl, toEl) === false) {
          return;
        }
        morphAttrs2(fromEl, toEl);
        onElUpdated(fromEl);
        if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
          return;
        }
      }
      if (fromEl.nodeName !== "TEXTAREA") {
        morphChildren(fromEl, toEl);
      } else {
        specialElHandlers.TEXTAREA(fromEl, toEl);
      }
    }
    function morphChildren(fromEl, toEl) {
      var skipFrom = skipFromChildren(fromEl);
      var curToNodeChild = toEl.firstChild;
      var curFromNodeChild = fromEl.firstChild;
      var curToNodeKey;
      var curFromNodeKey;
      var fromNextSibling;
      var toNextSibling;
      var matchingFromEl;
      outer:
        while (curToNodeChild) {
          toNextSibling = curToNodeChild.nextSibling;
          curToNodeKey = getNodeKey(curToNodeChild);
          while (!skipFrom && curFromNodeChild) {
            fromNextSibling = curFromNodeChild.nextSibling;
            if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
              curToNodeChild = toNextSibling;
              curFromNodeChild = fromNextSibling;
              continue outer;
            }
            curFromNodeKey = getNodeKey(curFromNodeChild);
            var curFromNodeType = curFromNodeChild.nodeType;
            var isCompatible = void 0;
            if (curFromNodeType === curToNodeChild.nodeType) {
              if (curFromNodeType === ELEMENT_NODE) {
                if (curToNodeKey) {
                  if (curToNodeKey !== curFromNodeKey) {
                    if (matchingFromEl = fromNodesLookup[curToNodeKey]) {
                      if (fromNextSibling === matchingFromEl) {
                        isCompatible = false;
                      } else {
                        fromEl.insertBefore(matchingFromEl, curFromNodeChild);
                        if (curFromNodeKey) {
                          addKeyedRemoval(curFromNodeKey);
                        } else {
                          removeNode(
                            curFromNodeChild,
                            fromEl,
                            true
                            /* skip keyed nodes */
                          );
                        }
                        curFromNodeChild = matchingFromEl;
                      }
                    } else {
                      isCompatible = false;
                    }
                  }
                } else if (curFromNodeKey) {
                  isCompatible = false;
                }
                isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                if (isCompatible) {
                  morphEl(curFromNodeChild, curToNodeChild);
                }
              } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                isCompatible = true;
                if (curFromNodeChild.nodeValue !== curToNodeChild.nodeValue) {
                  curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                }
              }
            }
            if (isCompatible) {
              curToNodeChild = toNextSibling;
              curFromNodeChild = fromNextSibling;
              continue outer;
            }
            if (curFromNodeKey) {
              addKeyedRemoval(curFromNodeKey);
            } else {
              removeNode(
                curFromNodeChild,
                fromEl,
                true
                /* skip keyed nodes */
              );
            }
            curFromNodeChild = fromNextSibling;
          }
          if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
            if (!skipFrom) {
              addChild(fromEl, matchingFromEl);
            }
            morphEl(matchingFromEl, curToNodeChild);
          } else {
            var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
            if (onBeforeNodeAddedResult !== false) {
              if (onBeforeNodeAddedResult) {
                curToNodeChild = onBeforeNodeAddedResult;
              }
              if (curToNodeChild.actualize) {
                curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
              }
              addChild(fromEl, curToNodeChild);
              handleNodeAdded(curToNodeChild);
            }
          }
          curToNodeChild = toNextSibling;
          curFromNodeChild = fromNextSibling;
        }
      cleanupFromEl(fromEl, curFromNodeChild, curFromNodeKey);
      var specialElHandler = specialElHandlers[fromEl.nodeName];
      if (specialElHandler) {
        specialElHandler(fromEl, toEl);
      }
    }
    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;
    if (!childrenOnly) {
      if (morphedNodeType === ELEMENT_NODE) {
        if (toNodeType === ELEMENT_NODE) {
          if (!compareNodeNames(fromNode, toNode)) {
            onNodeDiscarded(fromNode);
            morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
          }
        } else {
          morphedNode = toNode;
        }
      } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) {
        if (toNodeType === morphedNodeType) {
          if (morphedNode.nodeValue !== toNode.nodeValue) {
            morphedNode.nodeValue = toNode.nodeValue;
          }
          return morphedNode;
        } else {
          morphedNode = toNode;
        }
      }
    }
    if (morphedNode === toNode) {
      onNodeDiscarded(fromNode);
    } else {
      if (toNode.isSameNode && toNode.isSameNode(morphedNode)) {
        return;
      }
      morphEl(morphedNode, toNode, childrenOnly);
      if (keyedRemovalList) {
        for (var i = 0, len = keyedRemovalList.length; i < len; i++) {
          var elToRemove = fromNodesLookup[keyedRemovalList[i]];
          if (elToRemove) {
            removeNode(elToRemove, elToRemove.parentNode, false);
          }
        }
      }
    }
    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
      if (morphedNode.actualize) {
        morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
      }
      fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }
    return morphedNode;
  };
}
var morphdom = morphdomFactory(morphAttrs);
var morphdom_esm_default = morphdom;

// lib/http.js
var http_default = {
  createPatchForm(url, method) {
    const f = `<form method="post" action="${url}"><input type="hidden" name="_method" value="${method}" /></form>`;
    const parser = new DOMParser();
    return parser.parseFromString(f, "text/html").querySelector("form");
  },
  getAcceptValue: function(target) {
    if (target.dataset["turboStream"]) {
      return "text/vnd.turbo-stream.html, text/html, application/xhtml+xml";
    } else {
      return "text/html,application/xhtml+xml,application/xml";
    }
  },
  getBody(target) {
    return new FormData(target);
  },
  getCookieValue(cookieName) {
    if (cookieName != null) {
      const cookies = document.cookie ? document.cookie.split("; ") : [];
      const cookie = cookies.find((cookie2) => cookie2.startsWith(cookieName));
      if (cookie) {
        const value = cookie.split("=").slice(1).join("=");
        return value ? decodeURIComponent(value) : void 0;
      }
    }
  },
  getFormResponse: async function(target) {
    return await this.performSubmit(
      this.getUrl(target),
      this.getMethod(target),
      this.getBody(target),
      this.getAcceptValue(target)
    );
  },
  getLinkResponse: async function(url, method) {
    if (method == "get") {
      return this.performFetch(url);
    } else {
      const patchForm = this.createPatchForm(url, method);
      return this.getFormResponse(patchForm);
    }
  },
  getMetaContent(name) {
    const element = document.querySelector(`meta[name="${name}"]`);
    return element && element.content;
  },
  getMethod(target) {
    if (target.dataset["turboMethod"]) {
      return target.dataset["turboMethod"].toLowerCase();
    }
    if (target.method) {
      return target.method;
    }
    return "get";
  },
  getUrl(target) {
    if (target.getAttribute("action")) {
      return target.getAttribute("action");
    }
    return target.getAttribute("href");
  },
  onClick(e) {
    if (e.target.dataset["turbo"] == "false") {
      return true;
    }
    if (e.target.nodeName == "A") {
      e.preventDefault();
      e.stopPropagation();
      history.replaceState({ id: this.saveState(location.href, document.documentElement.innerHTML) }, "");
      this.visit(
        this.getUrl(e.target),
        this.getMethod(e.target),
        e.target.dataset["turboStream"] != void 0
      );
    }
  },
  onSubmit(e) {
    if (e.target.dataset["turbo"] == "false") {
      return true;
    }
    e.preventDefault();
    e.stopPropagation();
    history.replaceState({ id: this.saveState(location.href, document.documentElement.innerHTML) }, "");
    this.submit(e.target, e.target.dataset["turboStream"] != void 0);
  },
  performFetch: function(url) {
    return fetch(url, { headers: { Accept: "text/html,application/xhtml+xml,application/xml" } });
  },
  performSubmit: async function(url, method, body, acceptValue) {
    const token = this.getCookieValue(this.getMetaContent("csrf-param")) || this.getMetaContent("csrf-token");
    if (method == "get") {
      return this.performFetch(this.queryValueUrl(url, body));
    } else {
      return fetch(url, {
        method,
        body,
        headers: { Accept: acceptValue, "X-CSRF-Token": token }
      });
    }
  },
  queryValueUrl(url, body) {
    const params = new URLSearchParams(body);
    return `${url}?${params}`;
  }
};

// lib/turbo-frame.js
var TurboFrame = class extends window.HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onClick.bind(this), false);
    if (this.getAttribute("src")) {
      this.load(this.getAttribute("src"));
    }
  }
  async visit(url, method) {
    const response = await this.getLinkResponse(url, method);
    if (response.redirected) {
      return this.visit(response.url, "get");
    }
    const markup = await response.text();
    this.render(markup);
    window.requestAnimationFrame(window.Brutto.partialFireEvent("turbo:load"));
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
    morphdom_esm_default(this, dom.body);
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
    morphdom_esm_default(this, dom.getElementById(this.id));
  }
  afterSubmit(markup, url) {
    this.render(markup);
  }
};
Object.assign(TurboFrame.prototype, http_default);

// brutto.js
var Brutto = class {
  constructor() {
    this.states = {};
    window.addEventListener("popstate", this.historyPop.bind(this));
    window.addEventListener("click", this.onClick.bind(this));
    window.addEventListener("submit", this.onSubmit.bind(this));
    window.addEventListener("load", this.partialFireEvent("turbo:load"), false);
    this.initFrames();
  }
  initFrames() {
    window.customElements.define("turbo-frame", TurboFrame);
  }
  partialFireEvent(evt) {
    return function() {
      const event = new CustomEvent(evt);
      document.dispatchEvent(event);
    };
  }
  async visit(url, method, stream) {
    const response = await this.getLinkResponse(url, method);
    if (response.redirected) {
      return this.visit(response.url, "get");
    }
    const markup = await response.text();
    if (stream) {
      this.renderStream(markup);
    } else {
      this.historyPush(response.url, markup);
      this.render(markup);
    }
    window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
  }
  async submit(el, stream) {
    const response = await this.getFormResponse(el);
    const markup = await response.text();
    if (stream) {
      this.renderStream(markup);
    } else {
      this.historyPush(response.url, markup);
      this.render(markup);
    }
    window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
  }
  renderStream(markup, url) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(markup, "text/html");
    Array.from(dom.querySelectorAll("turbo-stream")).forEach(this.processStreamTemplate.bind(this));
  }
  processStreamTemplate(streamNode) {
    const action = streamNode.getAttribute("action");
    const target = streamNode.getAttribute("target");
    const targets = streamNode.getAttribute("targets");
    const template = streamNode.querySelector("template");
    if (target) {
      this.processStreamTarget(document.getElementById(target), action, template);
    }
    if (targets) {
      const targetEls = document.querySelectorAll(targets);
      for (let i = 0; i < targetEls.length; i++) {
        this.processStreamTarget(targetEls[i], action, template);
      }
    }
  }
  processStreamTarget(target, action, template) {
    switch (action) {
      case "after":
        target.after(template.content.cloneNode(true));
        break;
      case "append":
        target.append(template.content.cloneNode(true));
        break;
      case "before":
        target.parentElement.insertBefore(template.content.cloneNode(true), target);
        break;
      case "prepend":
        target.prepend(template.content.cloneNode(true));
        break;
      case "remove":
        target.remove();
        break;
      case "update":
        target.replaceChildren(template.content.cloneNode(true));
        break;
    }
  }
  saveState(url, markup) {
    const randomId = self.crypto.randomUUID();
    this.states[randomId] = {
      url,
      cache: markup,
      scroll: this.getScrollPosition()
    };
    return randomId;
  }
  render(response) {
    morphdom_esm_default(document.documentElement, response);
    return response;
  }
  historyPush(url, markup) {
    history.pushState({ id: this.saveState(url, markup) }, "", url);
    return markup;
  }
  historyPop(obj) {
    try {
      const state = this.states[obj.state.id];
      morphdom_esm_default(document.documentElement, state.cache);
      window.scrollTo(state.scroll.x, state.scroll.y);
      window.requestAnimationFrame(this.partialFireEvent("turbo:load"));
    } catch (err) {
      location.href = location.href;
    }
  }
  getScrollPosition() {
    return {
      x: window.scrollX,
      y: window.scrollY
    };
  }
};
Object.assign(Brutto.prototype, http_default);
var brutto = new Brutto();
window.Brutto = brutto;
var brutto_default = brutto;
export {
  brutto_default as default
};
