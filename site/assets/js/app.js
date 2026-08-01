/* ============================================================
   NYC Lean: events rendering + page motion.
   - renders upcoming events from assets/events.js into the home
     page (next 3) and the calendar page (all upcoming)
   - hero masthead reveal on load (home only)
   - one gentle grouped fade per content section on scroll
   Degrades gracefully: no JS or reduced-motion → everything visible.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Render events first, independent of GSAP, so they always show.
  renderEvents();

  if (!window.gsap || reduce) {
    window.clearTimeout(window.__nycLeanMotionFallback);
    root.classList.remove("js", "motion-ready");   // reveal everything, no motion
    return;
  }

  var gsap = window.gsap;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
  var ST = window.ScrollTrigger;
  var hasScroll = !!ST;

  root.classList.add("motion-ready");
  init();
  window.clearTimeout(window.__nycLeanMotionFallback);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (ST) ST.refresh(); });
  }

  function init() {
    /* ---- editorial hero entrance (home page only) ---- */
    if (document.querySelector(".home-page .hero")) {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".hero-eyebrow", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo(".hero-title-line", { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09 }, 0.08)
        .fromTo(".hero-deck", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, 0.38)
        .fromTo(".hero-actions", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.48)
        .fromTo(".hero-facts li", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 }, 0.58)
        .fromTo(".hero-photo", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9 }, 0.22)
        .fromTo(".hero-next", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.75 }, 0.48)
        .fromTo(".hero-orbit", { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: 1.1, stagger: 0.1, ease: "power2.out" }, 0.25);
    }

    /* ---- one gentle, grouped fade per content section ---- */
    var secs = Array.prototype.slice.call(document.querySelectorAll("main > section:not(.hero)"));
    secs.forEach(function (sec) {
      var items = sec.querySelectorAll("[data-anim]");
      if (!items.length) return;
      var a = { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.04 };
      if (hasScroll) a.scrollTrigger = { trigger: sec, start: "top 78%", once: true };
      gsap.fromTo(items, { opacity: 0, y: 16 }, a);
    });

    if (hasScroll) ST.refresh();
  }

  /* ---------- events ---------- */
  function parseDate(s) {
    var p = String(s || "").split("-");
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function startOfToday() {
    var n = new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "numeric",
        day: "numeric"
      }).formatToParts(n);
      var values = {};
      parts.forEach(function (part) {
        if (part.type !== "literal") values[part.type] = +part.value;
      });
      return new Date(values.year, values.month - 1, values.day);
    } catch (err) {
      return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    }
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function talkHTML(t, hideTitle) {
    var speaker = t.speakerUrl
      ? '<a href="' + esc(t.speakerUrl) + '" target="_blank" rel="noopener">' + esc(t.speaker) + '</a>'
      : esc(t.speaker);
    var title = t.titleUrl
      ? '<a href="' + esc(t.titleUrl) + '">' + esc(t.title) + '</a>'
      : esc(t.title);
    var abstractMore = t.abstractMore
      ? '<details class="talk-more"><summary>' +
          '<span class="talk-more-open">Show more</span>' +
          '<span class="talk-more-close">Show less</span>' +
        '</summary><p>' + esc(t.abstractMore) + '</p></details>'
      : '';
    return '<div class="talk">' +
      (!hideTitle && t.title ? '<p class="talk-title">' + title + '</p>' : '') +
      (t.speaker ? '<p class="talk-speaker">' + speaker + '</p>' : '') +
      (t.abstract ? '<p class="talk-abstract">' + esc(t.abstract) + '</p>' : '') + abstractMore +
    '</div>';
  }
  function rowHTML(e, isNext, compact) {
    var d = e._d;
    var dnum = d ? d.getDate() : "";
    var mon = d ? MO[d.getMonth()] : "";
    var yr = d ? d.getFullYear() : "";
    var wd = d ? WD[d.getDay()] : "";
    var loc = e.location
      ? (e.locationUrl
          ? '<a class="ev-loc" href="' + esc(e.locationUrl) + '" target="_blank" rel="noopener">' + esc(e.location) + '</a>'
          : esc(e.location))
      : '<span class="ev-loc ev-loc-tba">Location TBA</span>';
    var meta = [[wd, e.time].filter(Boolean).map(esc).join(" · "), loc]
      .filter(Boolean).join(" · ");
    var talk = e.talk || null;
    var heading = talk && talk.title ? talk.title : e.title;
    var headingHTML = talk && talk.titleUrl
      ? '<a href="' + esc(talk.titleUrl) + '">' + esc(heading) + '</a>'
      : esc(heading);
    var kind = talk ? ["Talk", e.title].filter(Boolean).join(" · ") : "";
    return '<article class="row event' + (isNext ? ' is-next' : '') + (compact ? ' is-compact' : '') + '" data-anim>' +
      '<time class="event-date" datetime="' + esc(e.date) + '"><span class="ev-dm">' + dnum + ' ' + esc(mon) + '</span>' +
        (yr ? '<span class="ev-y">' + yr + '</span>' : '') + '</time>' +
      '<div class="row-body">' +
        (isNext ? '<span class="ev-next">Next gathering</span>' : '') +
        '<span class="ev-meta">' + meta + '</span>' +
        (kind ? '<span class="ev-kind">' + esc(kind) + '</span>' : '') +
        '<h3>' + headingHTML + '</h3>' +
        (!compact && talk ? talkHTML(talk, true) :
          (!compact && (e.descriptionHtml || e.description) ? '<p>' + (e.descriptionHtml || esc(e.description)) + '</p>' : '')) +
        (!compact && e.rsvpUrl ? '<div class="ev-rsvp"><a class="btn btn-primary" href="' + esc(e.rsvpUrl) + '" target="_blank" rel="noopener">RSVP</a></div>' : '') +
      '</div></article>';
  }

  function heroEventHTML(e) {
    var d = e._d;
    var talk = e.talk || null;
    var heading = talk && talk.title ? talk.title : e.title;
    var headingHTML = talk && talk.titleUrl
      ? '<a href="' + esc(talk.titleUrl) + '">' + esc(heading) + '</a>'
      : esc(heading);
    var speaker = talk && talk.speaker
      ? (talk.speakerUrl
          ? '<a href="' + esc(talk.speakerUrl) + '" target="_blank" rel="noopener">' + esc(talk.speaker) + '</a>'
          : esc(talk.speaker))
      : '';
    var location = e.location
      ? (e.locationUrl
          ? '<a href="' + esc(e.locationUrl) + '" target="_blank" rel="noopener">' + esc(e.location) + ' <span aria-hidden="true">↗</span></a>'
          : esc(e.location))
      : 'Location TBA';
    var kind = talk ? 'Sunday talk' : 'Sunday meetup';
    var when = [WD[d.getDay()], e.time || 'Time TBA'].join(' · ');

    return '<article class="hero-event">' +
      '<time class="hero-event-date" datetime="' + esc(e.date) + '">' +
        '<span>' + esc(WD[d.getDay()]) + '</span>' +
        '<strong>' + esc(MO[d.getMonth()]) + ' ' + d.getDate() + '</strong>' +
      '</time>' +
      '<div class="hero-event-body">' +
        '<span class="hero-event-kind">' + kind + '</span>' +
        '<h2>' + headingHTML + '</h2>' +
        (speaker ? '<p class="hero-event-speaker">with ' + speaker + '</p>' : '') +
        '<dl class="hero-event-details">' +
          '<div><dt>When</dt><dd>' + esc(when) + '</dd></div>' +
          '<div><dt>Where</dt><dd>' + location + '</dd></div>' +
        '</dl>' +
        '<a class="hero-event-link" href="/calendar">Full details <span aria-hidden="true">→</span></a>' +
      '</div>' +
    '</article>';
  }
  function joinRows(list) {
    return list.join('<span class="rule"></span>');
  }
  function empty(msg) { return '<p class="cal-empty" data-anim>' + esc(msg) + '</p>'; }

  function renderEvents() {
    var home = document.getElementById("home-events");
    var heroNext = document.getElementById("hero-next-event");
    var calUp = document.getElementById("calendar-upcoming");
    var calPast = document.getElementById("calendar-past");
    var pastGroup = document.getElementById("past-group");
    if (!home && !heroNext && !calUp && !calPast) return;

    var today = startOfToday();
    var all = (window.NYC_LEAN_EVENTS || [])
      .map(function (e) { return Object.assign({}, e, { _d: parseDate(e.date) }); })
      .filter(function (e) { return e._d; });
    var upcoming = all.filter(function (e) { return e._d >= today; })
      .sort(function (a, b) { return a._d - b._d; });
    var past = all.filter(function (e) { return e._d < today; })
      .sort(function (a, b) { return b._d - a._d; });   // most recent first

    if (heroNext) {
      heroNext.innerHTML = upcoming.length
        ? heroEventHTML(upcoming[0])
        : '<p class="hero-next-fallback">Nothing is scheduled yet. <a href="/calendar">Check the calendar <span aria-hidden="true">↗</span></a></p>';
    }
    if (home) {
      home.innerHTML = upcoming.length
        ? joinRows(upcoming.slice(0, 3).map(function (e, i) { return rowHTML(e, i === 0, i > 0); }))
        : empty("No meetups on the calendar right now.");
    }
    if (calUp) {
      calUp.innerHTML = upcoming.length
        ? joinRows(upcoming.map(function (e, i) { return rowHTML(e, i === 0, false); }))
        : empty("Nothing scheduled yet.");
    }
    if (calPast) {
      var STEP = 10;
      var shown = 0;
      calPast.innerHTML = "";
      var moreBtn = null;
      if (past.length > STEP) {
        moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.className = "btn btn-ghost show-more";
        calPast.appendChild(moreBtn);
        moreBtn.addEventListener("click", showBatch);
      }
      showBatch();   // first 10

      function showBatch() {
        var prev = calPast.querySelectorAll(".row.event").length;
        var batch = past.slice(shown, shown + STEP);
        var leading = shown === 0 ? "" : '<span class="rule"></span>';
        var markup = leading + joinRows(batch.map(function (e) { return rowHTML(e, false, false); }));
        var firstBatch = shown === 0;
        shown += batch.length;
        if (moreBtn) moreBtn.insertAdjacentHTML("beforebegin", markup);
        else calPast.insertAdjacentHTML("beforeend", markup);
        if (!firstBatch && window.gsap) {
          var rows = Array.prototype.slice.call(calPast.querySelectorAll(".row.event")).slice(prev);
          window.gsap.fromTo(rows, { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: "power2.out" });
        }
        var remaining = past.length - shown;
        if (moreBtn) {
          if (remaining > 0) moreBtn.textContent = "Show " + Math.min(STEP, remaining) + " more";
          else moreBtn.remove();
        }
      }
    }
    if (pastGroup) {
      if (past.length) pastGroup.removeAttribute("hidden");
      else pastGroup.setAttribute("hidden", "");
    }
  }
})();

/* fixed navbar: gains a paper bar + ink underline once scrolled */
(function () {
  var nav = document.getElementById("nav");
  if (!nav) return;
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* mobile nav: hamburger toggles the menu panel (independent of motion) */
(function () {
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("site-nav");
  if (!toggle || !menu) return;

  // mark the page nav-ready so the CSS collapses the nav into a hamburger
  document.documentElement.classList.add("nav-ready");

  var lastFocused = null;

  function setOpen(open, restoreFocus) {
    if (open) lastFocused = document.activeElement;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);   // lock scroll behind overlay
    if (open) {
      window.requestAnimationFrame(function () {
        var first = menu.querySelector("a");
        if (first) first.focus();
      });
    } else if (restoreFocus && lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(toggle.getAttribute("aria-expanded") !== "true", false);
  });
  // a chosen link closes the menu
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false, false);
  });
  // Escape closes; Tab stays within the open mobile menu.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false, true);
      return;
    }
    if (e.key === "Tab" && toggle.getAttribute("aria-expanded") === "true") {
      var links = Array.prototype.slice.call(menu.querySelectorAll("a"));
      var first = links[0];
      var last = toggle;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  // tapping outside the header closes
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".nav-wrap")) setOpen(false, false);
  });
})();
