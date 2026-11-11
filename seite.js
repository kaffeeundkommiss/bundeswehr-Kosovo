/* Interaktive Teile aller Seiten. Ohne JavaScript bleibt alles lesbar:
   Zeitleiste als Liste, Quellenverweise als Sprungmarken, Karten als Bild. */
(function () {
  'use strict';

  var ARTEN = {
    bundestag: 'Bundestag',
    einsatz: 'Einsatz',
    gewalt: 'Anschläge und Gefechte',
    status: 'Status und Diplomatie'
  };

  // Eigene, einfache Symbole (24er-Raster, Füllung in Textfarbe)
  var SYMBOLE = {
    soldat: '<path fill-rule="evenodd" d="M1.4 18.6c1.1-.4 1.9-1.3 2.1-2.5C4.5 9.6 7.9 5 12 5s7.5 4.6 8.5 11.1c.2 1.2 1 2.1 2.1 2.5v1.8H1.4zM5.2 15.6h13.6v1.2H5.2z"/>',
    flugzeug: '<path d="M12 1.8c.8 0 1.3.9 1.3 1.9v5.4l8 4.6v2.2l-8-2.4v5l2.3 1.7v1.7L12 21l-3.6 1v-1.7l2.3-1.7v-5l-8 2.4v-2.2l8-4.6V3.7c0-1 .5-1.9 1.3-1.9z"/>',
    explosion: '<path d="M12 1.5l1.9 5.2 4.6-3-1.4 5.3 5.4.4-4.3 3.3 4.1 3.5-5.5.2 1.1 5.4-4.7-3.1L12 23l-1.4-5.3-4.7 3.1 1.1-5.4-5.5-.2 4.1-3.5L1.3 8.4l5.4-.4-1.4-5.3 4.6 3z"/><path d="M12 8.2l1 2.7 2.8.2-2.2 1.8 1 2.8-2.6-1.6-2.6 1.6 1-2.8-2.2-1.8 2.8-.2z" fill-opacity=".45" style="fill:var(--paper)"/>',
    bundestag: '<path d="M6.6 9.6a5.4 4.6 0 0 1 10.8 0z"/><path d="M3.2 10.4h17.6v1.8H3.2zM4.6 13h2v6.2h-2zM8.6 13h2v6.2h-2zM13.4 13h2v6.2h-2zM17.4 13h2v6.2h-2zM2.8 20h18.4v2H2.8zM11.2 3h1.6v3.6h-1.6z"/>',
    dokument: '<path fill-rule="evenodd" d="M5 2h10l4.5 4.5V22H5zm9 1.6V7.5h4zM7.5 11h9v1.5h-9zm0 3h9v1.5h-9zm0 3h6v1.5h-6z"/>'
  };
  var SYMBOL_JE_ART = { bundestag: 'bundestag', einsatz: 'soldat', gewalt: 'explosion', status: 'dokument' };
  function symbol(name) {
    var span = document.createElement('span');
    span.className = 'zl-symbol';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24" focusable="false">' + (SYMBOLE[name] || SYMBOLE.soldat) + '</svg>';
    return span;
  }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  function jahrAnteil(datum) {
    var t = datum.split('-');
    var j = +t[0], m = t[1] ? +t[1] - 1 : 6, d = t[2] ? +t[2] : 15;
    return j + (m * 30.4 + d) / 365;
  }

  /* ---------- Zeitleiste ---------- */
  function zeitleiste(ol) {
    var punkte = Array.prototype.slice.call(ol.querySelectorAll('li[data-datum]'));
    if (punkte.length < 3) return;
    var werte = punkte.map(function (li) { return jahrAnteil(li.getAttribute('data-datum')); });
    var von = Math.floor(Math.min.apply(null, werte));
    var bis = Math.ceil(Math.max.apply(null, werte) + 0.01);
    var spanne = bis - von;

    var box = el('div', { class: 'zl-steuerung' });
    var HINWEIS = 'Symbol auf der Zeitachse antippen, um zum Eintrag zu springen.';
    var hinweis = el('p', { class: 'zl-hinweis', 'aria-live': 'polite' }, HINWEIS);

    // Filter, nur wenn mehrere Arten vorkommen
    var arten = [];
    punkte.forEach(function (li) {
      var a = li.getAttribute('data-art');
      if (a && arten.indexOf(a) < 0) arten.push(a);
    });
    var filterLeiste = null;
    if (arten.length > 1) {
      filterLeiste = el('div', { class: 'zl-filter', role: 'group', 'aria-label': 'Einträge filtern' });
      var alle = el('button', { type: 'button', 'aria-pressed': 'true', 'data-art': '' }, 'Alle');
      filterLeiste.appendChild(alle);
      Object.keys(ARTEN).forEach(function (a) {
        if (arten.indexOf(a) < 0) return;
        var b = el('button', { type: 'button', 'aria-pressed': 'false', 'data-art': a });
        var marke = el('span', { class: 'zl-farbe art-' + a, 'aria-hidden': 'true' });
        marke.appendChild(symbol(SYMBOL_JE_ART[a]));
        b.appendChild(marke);
        b.appendChild(document.createTextNode(ARTEN[a]));
        filterLeiste.appendChild(b);
      });
      box.appendChild(filterLeiste);
    }

    // Achse
    var achsenbox = el('div', { class: 'zl-achsenbox' });
    var achse = el('div', { class: 'zl-achse' });
    achsenbox.appendChild(achse);
    var linie = el('div', { class: 'zl-linie', 'aria-hidden': 'true' });
    achse.appendChild(linie);
    var schritt = spanne > 12 ? 5 : 2;
    for (var j = Math.ceil(von / schritt) * schritt; j <= bis; j += schritt) {
      var m = el('span', { class: 'zl-jahr', 'aria-hidden': 'true' }, String(j));
      m.style.left = ((j - von) / spanne * 100) + '%';
      achse.appendChild(m);
    }
    var knoepfe = [];
    punkte.forEach(function (li, i) {
      if (!li.id) li.id = 'zl-' + li.getAttribute('data-datum') + '-' + i;
      li.setAttribute('tabindex', '-1');
      var art = li.getAttribute('data-art') || '';
      if (art) li.classList.add('art-' + art);
      var zeit = li.querySelector('time');
      var b = el('button', {
        type: 'button', class: 'zl-punkt art-' + art,
        'aria-label': (zeit ? zeit.textContent + ': ' : '') + (ARTEN[art] || 'Eintrag'),
        'data-ziel': li.id
      });
      b.appendChild(symbol(li.getAttribute('data-symbol') || SYMBOL_JE_ART[art]));
      b.style.left = ((werte[i] - von) / spanne * 100) + '%';
      b.addEventListener('click', function () { waehle(li, true); });
      b.addEventListener('mouseenter', function () { vorschau(li); });
      b.addEventListener('focus', function () { vorschau(li); });
      b.addEventListener('mouseleave', vorschauAus);
      b.addEventListener('blur', vorschauAus);
      achse.appendChild(b);
      knoepfe.push(b);
    });
    box.appendChild(achsenbox);
    box.appendChild(hinweis);

    // Vor/Zurück
    var nav = el('div', { class: 'zl-schritte' });
    var zurueck = el('button', { type: 'button' }, '‹ früher');
    var vor = el('button', { type: 'button' }, 'später ›');
    nav.appendChild(zurueck); nav.appendChild(vor);
    box.appendChild(nav);

    ol.parentNode.insertBefore(box, ol);
    ol.classList.add('zl-aktiv');

    // Punkte, die sich überdecken würden, auf Spuren verteilen
    var SPUREN = [78, 40, 2];
    function verteilen() {
      var breite = achse.clientWidth, letzte = [-99, -99, -99];
      var abstand = knoepfe[0] ? knoepfe[0].offsetWidth + 3 : 38;
      knoepfe.forEach(function (k, i) {
        if (k.hidden) return;
        var x = (werte[i] - von) / spanne * breite, s = 0;
        while (s < SPUREN.length - 1 && x - letzte[s] < abstand) s++;
        letzte[s] = x;
        k.style.top = SPUREN[s] + 'px';
      });
    }
    verteilen();
    window.addEventListener('resize', verteilen);

    var aktiv = null;
    function sichtbar() { return punkte.filter(function (li) { return !li.hidden; }); }
    function waehle(li, springen) {
      if (aktiv) aktiv.classList.remove('gewaehlt');
      knoepfe.forEach(function (k) { k.classList.toggle('gewaehlt', k.getAttribute('data-ziel') === li.id); });
      aktiv = li; li.classList.add('gewaehlt'); vorschau(li);
      if (springen) {
        li.scrollIntoView({ behavior: bewegung() ? 'smooth' : 'auto', block: 'center' });
        li.focus({ preventScroll: true });
      }
    }
    function schrittweise(r) {
      var s = sichtbar(); if (!s.length) return;
      var i = aktiv ? s.indexOf(aktiv) : -1;
      i = i < 0 ? (r > 0 ? 0 : s.length - 1) : Math.max(0, Math.min(s.length - 1, i + r));
      waehle(s[i], true);
    }
    zurueck.addEventListener('click', function () { schrittweise(-1); });
    vor.addEventListener('click', function () { schrittweise(1); });

    function kurz(li) {
      var zeit = li.querySelector('time');
      var text = li.querySelector('div');
      var satz = text ? text.textContent.replace(/\s*\[\d+\][\s\S]*$/, '').split(/\.\s/)[0].replace(/\.$/, '') + '.' : '';
      return (zeit ? zeit.textContent + ': ' : '') + satz;
    }
    function vorschau(li) { hinweis.textContent = kurz(li); hinweis.classList.add('vorschau'); }
    function vorschauAus() {
      if (aktiv) { hinweis.textContent = kurz(aktiv); return; }
      hinweis.textContent = HINWEIS; hinweis.classList.remove('vorschau');
    }

    if (filterLeiste) {
      filterLeiste.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var art = b.getAttribute('data-art');
        Array.prototype.forEach.call(filterLeiste.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        punkte.forEach(function (li, i) {
          var zeigen = !art || li.getAttribute('data-art') === art;
          li.hidden = !zeigen;
          knoepfe[i].hidden = !zeigen;
        });
        verteilen();
      });
    }
  }

  function bewegung() {
    return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- Quellenverweise als Einblendung ---------- */
  function quellenEinblendung() {
    var pop = el('div', { class: 'quelle-pop', role: 'dialog', 'aria-label': 'Quelle' });
    pop.hidden = true;
    document.body.appendChild(pop);
    var offenFuer = null;

    function schliessen() {
      pop.hidden = true;
      if (offenFuer) offenFuer.setAttribute('aria-expanded', 'false');
      offenFuer = null;
    }

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#q"], a[href^="#k"]');
      if (a && !a.closest('.quellen, .quelle-pop')) {
        var id = a.getAttribute('href').slice(1);
        var ziel = document.getElementById(id);
        if (!ziel || ziel.tagName !== 'LI') return;
        e.preventDefault();
        if (offenFuer === a) { schliessen(); return; }
        pop.innerHTML = '';
        var inhalt = ziel.cloneNode(true);
        inhalt.removeAttribute('id');
        var knr = inhalt.querySelector('.knr'); if (knr) knr.remove();
        pop.appendChild(el('div', { class: 'quelle-nr' }, a.textContent.trim()));
        var body = el('div', { class: 'quelle-text' });
        while (inhalt.firstChild) body.appendChild(inhalt.firstChild);
        pop.appendChild(body);
        var unten = el('div', { class: 'quelle-fuss' });
        var link = el('a', { href: '#' + id }, 'In der Quellenliste zeigen');
        link.addEventListener('click', function (ev) {
          ev.preventDefault(); schliessen();
          aufklappenFuer(ziel);
          ziel.scrollIntoView({ behavior: bewegung() ? 'smooth' : 'auto', block: 'center' });
          history.replaceState(null, '', '#' + id);
          ziel.classList.add('blinkt'); setTimeout(function () { ziel.classList.remove('blinkt'); }, 1600);
        });
        var zu = el('button', { type: 'button', class: 'quelle-zu', 'aria-label': 'Schließen' }, '×');
        zu.addEventListener('click', schliessen);
        unten.appendChild(link); unten.appendChild(zu);
        pop.appendChild(unten);
        if (offenFuer) offenFuer.setAttribute('aria-expanded', 'false');
        offenFuer = a; a.setAttribute('aria-expanded', 'true');
        pop.hidden = false;
        platzieren(a);
        return;
      }
      if (!e.target.closest('.quelle-pop')) schliessen();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && offenFuer) { var a = offenFuer; schliessen(); a.focus(); }
    });
    window.addEventListener('resize', schliessen);

    function platzieren(a) {
      var r = a.getBoundingClientRect();
      var w = Math.min(360, document.documentElement.clientWidth - 24);
      pop.style.width = w + 'px';
      var x = Math.max(12, Math.min(r.left + window.scrollX - 20, window.scrollX + document.documentElement.clientWidth - w - 12));
      pop.style.left = x + 'px';
      var h = pop.offsetHeight;
      var oben = r.top - h - 8 > 0;
      pop.style.top = (oben ? r.top + window.scrollY - h - 8 : r.bottom + window.scrollY + 8) + 'px';
    }
  }

  /* ---------- Karten ---------- */
  function karten() {
    Array.prototype.forEach.call(document.querySelectorAll('.kartenrahmen'), function (fig) {
      var svg = fig.querySelector('svg.kartesvg');
      if (!svg || !svg.querySelector('.prov, .flg')) return;
      var info = el('p', { class: 'karten-info', 'aria-live': 'polite' }, 'Provinz antippen oder mit der Maus darauf zeigen.');
      var box = fig.querySelector('.kartenbox') || svg;
      box.parentNode.insertBefore(info, box.nextSibling);
      var provinzen = svg.querySelectorAll('.prov, .flg');
      var gewaehlt = null;
      Array.prototype.forEach.call(provinzen, function (p) {
        var t = p.querySelector('title');
        var text = p.getAttribute('data-info') || (t ? t.textContent : '');
        p.setAttribute('tabindex', '0');
        p.setAttribute('role', 'button');
        p.setAttribute('aria-label', text);
        function zeige() { info.textContent = text; }
        p.addEventListener('mouseenter', zeige);
        p.addEventListener('focus', zeige);
        p.addEventListener('click', function () {
          if (gewaehlt) gewaehlt.classList.remove('gewaehlt');
          gewaehlt = p; p.classList.add('gewaehlt'); zeige();
        });
        p.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.dispatchEvent(new MouseEvent('click')); }
        });
      });
      // Legende: Regionalkommando hervorheben
      var legende = fig.querySelector('.legende[data-hebt]');
      if (legende) {
        Array.prototype.forEach.call(legende.querySelectorAll('li[data-rc]'), function (li) {
          var rc = li.getAttribute('data-rc');
          var b = el('button', { type: 'button', class: 'legende-knopf', 'aria-pressed': 'false' });
          while (li.firstChild) b.appendChild(li.firstChild);
          li.appendChild(b);
          b.addEventListener('click', function () {
            var an = b.getAttribute('aria-pressed') !== 'true';
            Array.prototype.forEach.call(legende.querySelectorAll('.legende-knopf'), function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', String(an));
            svg.classList.toggle('hebt', an);
            Array.prototype.forEach.call(provinzen, function (p) {
              p.classList.toggle('hervor', an && p.classList.contains('rc-' + rc));
            });
            Array.prototype.forEach.call(svg.querySelectorAll('.flaggen'), function (g) {
              g.classList.toggle('hervor', an && g.getAttribute('data-rc') === rc);
            });
            info.textContent = an ? b.textContent.trim() + ' hervorgehoben' : 'Provinz antippen oder mit der Maus darauf zeigen.';
          });
        });
      }
    });
  }

  /* ---------- Teilen ----------
     Jedes Element mit data-teilen bekommt einen Teilen-Knopf. Geteilt wird die Seite
     teilen/<id>.html: Sie trägt das Vorschaubild genau dieses Elements und leitet
     Besucher zur Stelle auf der Hauptseite weiter. Erzeugt mit werkzeuge/teilen.js. */
  var ICON_TEILEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7"/></svg>';
  var ICON_BILD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  function teilen() {
    var knoten = document.querySelectorAll('[data-teilen][id]');
    if (!knoten.length) return;
    Array.prototype.forEach.call(knoten, function (k) {
      var id = k.id;
      var url = new URL('teilen/' + id + '.html', location.href).href;
      var titel = k.getAttribute('data-titel') || document.title;
      var leiste = el('div', { class: 'teilen-leiste' });
      var b = el('button', { type: 'button', class: 'haupt' });
      b.innerHTML = ICON_TEILEN;
      b.appendChild(document.createTextNode('Teilen'));
      b.setAttribute('aria-label', 'Teilen: ' + titel);
      var bild = el('a', { href: 'teilen/bilder/' + id + '-hoch.jpg', download: id + '.jpg' });
      bild.innerHTML = ICON_BILD;
      bild.appendChild(document.createTextNode('Bild'));
      bild.setAttribute('aria-label', 'Bild herunterladen: ' + titel);
      var meldung = el('span', { class: 'teilen-meldung', role: 'status' });
      b.addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({ title: titel, url: url }).catch(function () {});
          return;
        }
        var fertig = function () { meldung.textContent = 'Link kopiert'; setTimeout(function () { meldung.textContent = ''; }, 2500); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(fertig, function () { window.prompt('Link kopieren:', url); });
        } else {
          window.prompt('Link kopieren:', url);
        }
      });
      leiste.appendChild(b);
      leiste.appendChild(bild);
      leiste.appendChild(meldung);
      k.appendChild(leiste);
    });
  }


  /* ---------- Abschnitte ein- und ausklappen ----------
     Jeder Abschnitt mit eigener Überschrift (section[aria-labelledby] > h2) bekommt einen
     Knopf in der Überschrift (Disclosure-Muster). Standard: eingeklappt, außer Abschnitten mit data-offen. Ohne JavaScript
     und beim Drucken bleibt alles sichtbar. Sprungmarken in eingeklappte Abschnitte
     (Quellen, Ereignisse, geteilte Links) klappen den Abschnitt vorher auf. */
  var ICON_KLAPP = '<svg class="klapp-pfeil" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 4l4 4 4-4"/></svg>';
  var bisSuche = 'onbeforematch' in document.body;
  var klappAbschnitte = [];

  function setzeOffen(ab, offen) {
    ab.knopf.setAttribute('aria-expanded', String(offen));
    ab.section.classList.toggle('zu', !offen);
    if (offen) {
      ab.inhalt.removeAttribute('hidden');
    } else if (bisSuche) {
      ab.inhalt.setAttribute('hidden', 'until-found');
    } else {
      ab.inhalt.hidden = true;
    }
  }
  function nachAufklappen() {
    // Zeitleiste und Karten messen beim Größenwechsel neu
    window.dispatchEvent(new Event('resize'));
  }
  function aufklappenFuer(ziel) {
    var geaendert = false;
    klappAbschnitte.forEach(function (ab) {
      if (ab.inhalt.contains(ziel) && ab.inhalt.hidden !== false) { setzeOffen(ab, true); geaendert = true; }
    });
    if (geaendert) { nachAufklappen(); if (klappen.aktualisieren) klappen.aktualisieren(); }
  }

  function klappen() {
    var sections = document.querySelectorAll('main section[aria-labelledby]');
    Array.prototype.forEach.call(sections, function (section) {
      var h2 = document.getElementById(section.getAttribute('aria-labelledby'));
      if (!h2 || h2.tagName !== 'H2' || h2.parentNode !== section) return;
      var inhalt = el('div', { class: 'klapp-inhalt', id: h2.id + '-inhalt' });
      while (h2.nextSibling) inhalt.appendChild(h2.nextSibling);
      section.appendChild(inhalt);
      var knopf = el('button', { type: 'button', 'aria-expanded': 'true', 'aria-controls': inhalt.id });
      while (h2.firstChild) knopf.appendChild(h2.firstChild);
      knopf.insertAdjacentHTML('beforeend', ICON_KLAPP);
      h2.appendChild(knopf);
      h2.classList.add('klapp-kopf');
      var ab = { section: section, knopf: knopf, inhalt: inhalt };
      knopf.addEventListener('click', function () {
        var offen = knopf.getAttribute('aria-expanded') !== 'true';
        setzeOffen(ab, offen);
        if (offen) nachAufklappen();
        alleAktualisieren();
      });
      inhalt.addEventListener('beforematch', function () { setzeOffen(ab, true); nachAufklappen(); alleAktualisieren(); });
      klappAbschnitte.push(ab);
    });
    if (!klappAbschnitte.length) return;
    // Abschnitte mit data-offen (z. B. Kennzahlen) bleiben zu Beginn offen
    klappAbschnitte.forEach(function (ab) { setzeOffen(ab, ab.section.hasAttribute('data-offen')); });

    // Ein Knopf für alle Abschnitte
    var leiste = el('div', { class: 'klapp-alle' });
    var alle = el('button', { type: 'button' });
    leiste.appendChild(alle);
    klappAbschnitte[0].section.parentNode.insertBefore(leiste, klappAbschnitte[0].section);
    function alleAktualisieren() {
      var alleOffen = klappAbschnitte.every(function (ab) { return ab.knopf.getAttribute('aria-expanded') === 'true'; });
      alle.textContent = alleOffen ? 'Alle Abschnitte einklappen' : 'Alle Abschnitte ausklappen';
      alle.setAttribute('data-offen', String(alleOffen));
    }
    alle.addEventListener('click', function () {
      var oeffnen = alle.getAttribute('data-offen') !== 'true';
      klappAbschnitte.forEach(function (ab) { setzeOffen(ab, oeffnen); });
      if (oeffnen) nachAufklappen();
      alleAktualisieren();
    });
    alleAktualisieren();
    klappen.aktualisieren = alleAktualisieren;

    // Sprungmarken: vor dem Springen aufklappen
    function zuHash() {
      var id = decodeURIComponent(location.hash.slice(1));
      var ziel = id && document.getElementById(id);
      if (!ziel) return;
      var war = ziel.closest('.klapp-inhalt');
      if (war && war.hidden !== false) {
        aufklappenFuer(ziel);
        ziel.scrollIntoView({ block: 'start' });
      }
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented) return;
      var ziel = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (ziel) aufklappenFuer(ziel);
    });
    window.addEventListener('hashchange', zuHash);
    zuHash();
  }

  document.querySelectorAll('ol.zeitleiste').forEach(zeitleiste);
  quellenEinblendung();
  karten();
  teilen();
  klappen();
})();
