/* Link teilen: „Link kopieren“ je Abschnitt, wie in den Parteimonitoren.

   Jede Überschrift h2 im Inhalt bekommt am Ende ihres Abschnitts unten rechts einen
   Knopf. Er kopiert die Adresse der Seite mit Sprungmarke auf die Überschrift
   (#id der h2), auf dem Handy über das Teilen-Menü des Systems. Ohne Zwischenablage
   zeigt ein Fenster die Adresse zum Kopieren an.

   Nur der Link, kein Bild-Export. Optik wie teilen.js der Monitore, mit den
   Farbvariablen aus basis.css. Wird als letztes Skript der Seite geladen (defer),
   damit einklappbare Abschnitte schon aufgebaut sind. */
(function () {
  "use strict";

  var CSS =
    ".lt-leiste{display:flex;justify-content:flex-end;gap:6px;margin-top:12px;clear:both}" +
    ".lt-knopf{font:600 13px/1 var(--kk-text,sans-serif);padding:9px 12px;min-height:36px;" +
    "border:1px solid var(--kk-linie,#d8d4cc);border-radius:6px;background:var(--kk-papier,#fff);" +
    "color:var(--kk-grau,#5b5b5b);cursor:pointer}" +
    ".lt-knopf:hover{color:var(--kk-tinte,#1a1a1a);border-color:var(--kk-grau,#5b5b5b)}" +
    ".lt-knopf:focus-visible{outline:2px solid var(--kk-akzent,#1E4FD8);outline-offset:2px}" +
    ".lt-knopf.ok{color:var(--kk-akzent,#1E4FD8);border-color:currentColor}" +
    "@media print{.lt-leiste{display:none}}";

  function slug(text) {
    return "abschnitt-" + text.toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  }

  function link(id) {
    var u = new URL(location.href);
    u.hash = id;
    return u.toString();
  }

  function rueckmeldung(knopf, text) {
    knopf.textContent = text;
    knopf.classList.add("ok");
    setTimeout(function () { knopf.textContent = "Link kopieren"; knopf.classList.remove("ok"); }, 1800);
  }

  function kopieren(knopf, id, name) {
    var url = link(id);
    var touch = window.matchMedia && matchMedia("(pointer:coarse)").matches;
    var weiter = Promise.resolve(false);
    if (touch && navigator.share) {
      weiter = navigator.share({ title: document.title + " · " + name, url: url })
        .then(function () { return true; })
        .catch(function (e) { return !!(e && e.name === "AbortError"); });
    }
    weiter.then(function (erledigt) {
      if (erledigt) return;
      var schreiben = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(url) : Promise.reject();
      schreiben.then(function () { rueckmeldung(knopf, "Kopiert"); },
        function () { window.prompt("Link zu diesem Abschnitt:", url); });
    });
  }

  // Abschnitt einer Überschrift: bis zur nächsten h2, höchstens bis zum Ende des
  // umgebenden section, details oder article. Der Knopf steht am Ende dieses Abschnitts.
  function ausstatten(h2, naechste) {
    var main = h2.closest("main");
    if (!main || h2.closest(".einleitung, nav")) return;
    var name = (h2.textContent || "").replace(/\s+/g, " ").trim();
    if (!name || /^weiter(lesen)?$/i.test(name) || h2.id === "weiter") return;
    var own = h2.parentElement && h2.parentElement.tagName === "SUMMARY"
      ? h2.parentElement.parentElement : (h2.closest("section, details, article") || main);
    if (!main.contains(own)) own = main;
    if (!h2.id) h2.id = slug(name);
    var id = h2.id;

    var b = document.createElement("button");
    b.type = "button";
    b.className = "lt-knopf";
    b.textContent = "Link kopieren";
    b.title = "Link zu „" + name + "“ kopieren";
    b.setAttribute("aria-label", b.title);
    b.addEventListener("click", function () { kopieren(b, id, name); });
    var leiste = document.createElement("div");
    leiste.className = "lt-leiste";
    leiste.appendChild(b);

    if (naechste && own.contains(naechste)) {
      // Vor das Element setzen, das die nächste Überschrift enthält
      var c = h2.parentElement;
      while (c && !c.contains(naechste)) c = c.parentElement;
      var vor = naechste;
      while (vor.parentElement !== c) vor = vor.parentElement;
      if (vor.tagName === "SUMMARY") return;
      c.insertBefore(leiste, vor);
      var o = getComputedStyle(vor).order;
      if (o && o !== "0") leiste.style.order = o;
    } else {
      // Einklappbare Abschnitte (seite.js): Knopf in den Inhalt, damit er mit zuklappt.
      var ziel = own.querySelector(":scope > .klapp-inhalt") || own;
      ziel.appendChild(leiste);
      // Flex-Layouts mit order (z. B. Karte auf dem Handy): Knopf trotzdem ans Ende
      var max = 0;
      Array.prototype.forEach.call(ziel.querySelectorAll(":scope > *, :scope > * > *"), function (x) {
        var n = parseInt(getComputedStyle(x).order, 10) || 0;
        if (n > max) max = n;
      });
      if (max > 0) leiste.style.order = String(max);
    }
  }

  function init() {
    if (!document.getElementById("lt-stil")) {
      var st = document.createElement("style");
      st.id = "lt-stil";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    var alle = document.querySelectorAll("main h2");
    for (var i = 0; i < alle.length; i++) ausstatten(alle[i], alle[i + 1] || null);
    // Erst hier vergebene ids: Sprung nachholen
    var id = decodeURIComponent(location.hash.slice(1));
    var z = id && document.getElementById(id);
    if (z && /^abschnitt-/.test(id)) {
      var d = z.closest("details");
      if (d) d.open = true;
      z.scrollIntoView({ block: "start" });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
