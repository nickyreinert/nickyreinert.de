// Fetches and renders Webmentions for the current page from webmention.io.
// Public per-page API, no token needed: https://webmention.io/api
(function () {
  "use strict";

  var container = document.getElementById("webmentions");
  if (!container) return;

  var target = container.getAttribute("data-target");
  var api = container.getAttribute("data-api");
  var labels = {
    title: container.getAttribute("data-label-title"),
    likes: container.getAttribute("data-label-likes"),
    reposts: container.getAttribute("data-label-reposts"),
    replies: container.getAttribute("data-label-replies"),
    loading: container.getAttribute("data-label-loading"),
    error: container.getAttribute("data-label-error"),
  };

  function isSafeURL(url) {
    try {
      var parsed = new URL(url, location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    for (var key in attrs || {}) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, attrs[key]);
      }
    }
    if (text) node.textContent = text; // textContent, never innerHTML: mentions are untrusted input.
    return node;
  }

  function renderFacepile(labelText, entries) {
    if (!entries.length) return null;
    var section = el("div", { style: "margin-bottom: 1rem;" });
    section.appendChild(el("strong", {}, labelText + " (" + entries.length + ")"));
    var row = el("div", { style: "display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem;" });
    entries.forEach(function (entry) {
      var author = entry.author || {};
      var link = el("a", {
        href: isSafeURL(author.url) ? author.url : "#",
        target: "_blank",
        rel: "noopener noreferrer",
        title: author.name || "",
      });
      if (author.photo && isSafeURL(author.photo)) {
        link.appendChild(
          el("img", {
            src: author.photo,
            alt: author.name || "",
            style: "width: 32px; height: 32px; border-radius: 50%; object-fit: cover;",
            loading: "lazy",
          })
        );
      } else {
        var initial = (author.name || "?").trim().charAt(0).toUpperCase();
        var fallback = el("span", {
          style:
            "display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; " +
            "border-radius: 50%; background: #e0e0e0; font-size: 0.9rem;",
        }, initial);
        link.appendChild(fallback);
      }
      row.appendChild(link);
    });
    section.appendChild(row);
    return section;
  }

  function renderReplies(labelText, entries) {
    if (!entries.length) return null;
    var section = el("div", {});
    section.appendChild(el("strong", {}, labelText + " (" + entries.length + ")"));
    entries.forEach(function (entry) {
      var author = entry.author || {};
      var card = el("div", {
        style: "margin-top: 0.75rem; padding: 0.75rem; border-left: 3px solid #9a9a9a;",
      });
      var byline = el("div", { style: "font-size: 0.9rem; margin-bottom: 0.3rem;" });
      if (author.url && isSafeURL(author.url)) {
        byline.appendChild(el("a", { href: author.url, target: "_blank", rel: "noopener noreferrer" }, author.name || author.url));
      } else {
        byline.appendChild(el("span", {}, author.name || "Anonymous"));
      }
      card.appendChild(byline);
      var content = (entry.content && (entry.content.text || entry.content.value)) || entry.name || "";
      if (content) {
        card.appendChild(el("div", { style: "font-size: 0.95rem;" }, String(content).slice(0, 500)));
      }
      if (entry.url && isSafeURL(entry.url)) {
        card.appendChild(el("a", { href: entry.url, target: "_blank", rel: "noopener noreferrer", style: "font-size: 0.85rem;" }, entry.url));
      }
      section.appendChild(card);
    });
    return section;
  }

  container.appendChild(el("p", { class: "webmentions-loading" }, labels.loading));

  fetch(api + "?target=" + encodeURIComponent(target))
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (data) {
      container.textContent = "";
      var children = (data && data.children) || [];
      var likes = children.filter(function (e) { return e["wm-property"] === "like-of"; });
      var reposts = children.filter(function (e) { return e["wm-property"] === "repost-of"; });
      var replies = children.filter(function (e) {
        return e["wm-property"] === "in-reply-to" || e["wm-property"] === "mention-of";
      });

      if (!likes.length && !reposts.length && !replies.length) return; // nothing to show, leave container empty

      container.appendChild(el("h2", { style: "font-size: 1.3rem; margin-bottom: 1rem;" }, labels.title));
      [renderFacepile(labels.likes, likes), renderFacepile(labels.reposts, reposts), renderReplies(labels.replies, replies)]
        .filter(Boolean)
        .forEach(function (node) { container.appendChild(node); });
    })
    .catch(function () {
      container.textContent = "";
      container.appendChild(el("p", { style: "color: #878787; font-size: 0.9rem;" }, labels.error));
    });
})();
