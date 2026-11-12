(() => {
    "use strict";

    const CM_PER_INCH = 2.54;
    // Absorbs floating-point noise so a bag exactly at the limit is accepted
    // (e.g. 21.65 in = 54.99 cm against a 55 cm limit).
    const TOLERANCE_CM = 1e-6;
    const DIMENSION_KEYS = ["height", "width", "depth"];

    const $ = (id) => document.getElementById(id);

    const dom = {
        inputs: Object.fromEntries(DIMENSION_KEYS.map((key) => [key, $(key)])),
        suffixes: document.querySelectorAll("[data-suffix]"),
        unitButtons: document.querySelectorAll("[data-unit]"),
        status: $("status"),
        results: $("results"),
        summary: $("summary"),
        search: $("search"),
        searchNote: $("search-note"),
        list: $("airline-list"),
        openAll: $("open-all"),
        sheet: $("all-airlines"),
        sheetSearch: $("modal-search"),
        sheetList: $("modal-list"),
    };

    // Each airline: { name, dims: [h, w, d] in cm, sorted: dims sorted largest first }
    let airlines = [];
    let unit = "cm";
    // The exact bag, in cm, as last typed. This is the source of truth for matching.
    // The input fields are only a display of it, so rounding a converted value for
    // display can never change which airlines fit. An empty or invalid field counts as 0.
    const bagCm = { height: 0, width: 0, depth: 0 };
    // The bag sorted largest first. Used for matching and for the "Fits" markers.
    let bag = [0, 0, 0];

    // ---------- Helpers ----------

    // Returns a positive number, or null when the field is empty, zero or invalid.
    function parseDimension(raw) {
        const value = parseFloat(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function sortDescending(values) {
        return [...values].sort((a, b) => b - a);
    }

    function plural(count, word) {
        return `${count} ${word}${count === 1 ? "" : "s"}`;
    }

    // Rotation-aware fit. A box fits inside another when its dimensions, sorted
    // largest first, are each less than or equal to the airline's. That covers
    // every way of turning the bag, so 40 × 55 × 25 matches a 55 × 40 × 25 limit.
    function fits(bagSorted, airline) {
        return bagSorted.every((value, i) => value <= airline.sorted[i] + TOLERANCE_CM);
    }

    function normalise(entry) {
        const dims = DIMENSION_KEYS.map((key) => Number(entry.dimensions[key]));
        return { name: entry.airline, dims, sorted: sortDescending(dims) };
    }

    // ---------- Units ----------

    function toDisplay(cm) {
        return unit === "in" ? cm / CM_PER_INCH : cm;
    }

    // One decimal place, trailing zero dropped: 55 -> "55", 21.65 -> "21.7".
    function formatNumber(value) {
        return String(Number(value.toFixed(1)));
    }

    function formatLimit(airline) {
        return `${airline.dims.map((cm) => formatNumber(toDisplay(cm))).join(" × ")} ${unit}`;
    }

    // Called when a field is typed in: store its exact value in cm (empty means 0).
    function onDimensionInput(key) {
        const value = parseDimension(dom.inputs[key].value) ?? 0;
        bagCm[key] = value * (unit === "in" ? CM_PER_INCH : 1);
        update();
    }

    // Switching units keeps the physical bag the same size: 55 cm becomes 21.65 in.
    // Only the display is rounded. The stored cm values are left untouched.
    // Empty fields stay empty.
    function setUnit(next) {
        if (next === unit) return;

        unit = next;
        for (const key of DIMENSION_KEYS) {
            if (dom.inputs[key].value !== "") {
                dom.inputs[key].value = String(Math.round(toDisplay(bagCm[key]) * 100) / 100);
            }
        }

        dom.unitButtons.forEach((button) => {
            button.setAttribute("aria-pressed", String(button.dataset.unit === next));
        });
        dom.suffixes.forEach((suffix) => {
            suffix.textContent = next;
        });
        update();
    }

    // ---------- Rendering ----------

    function buildRow(airline, fitStatus) {
        const row = document.createElement("li");
        row.className = "airline";
        row.dataset.name = airline.name;

        const name = document.createElement("span");
        name.className = "airline-name";
        name.textContent = airline.name;

        const meta = document.createElement("span");
        meta.className = "airline-meta";

        const limit = document.createElement("span");
        limit.className = "airline-limit";
        limit.textContent = formatLimit(airline);
        meta.append(limit);

        if (fitStatus !== null) {
            const pill = document.createElement("span");
            pill.className = `pill ${fitStatus ? "pill-ok" : "pill-no"}`;
            pill.textContent = fitStatus ? "Fits" : "Too big";
            meta.append(pill);
        }

        row.append(name, meta);
        return row;
    }

    // Runs on every keystroke. Missing dimensions count as 0, so the list
    // narrows as soon as the first value is typed.
    function update() {
        bag = sortDescending(DIMENSION_KEYS.map((key) => bagCm[key]));

        // The results stay hidden on a fresh page. They appear once any field has a value.
        const anyEntered = DIMENSION_KEYS.some((key) => dom.inputs[key].value !== "");
        dom.results.hidden = !anyEntered;
        if (!anyEntered) return;

        const fitting = airlines.filter((airline) => fits(bag, airline));
        dom.list.replaceChildren(...fitting.map((airline) => buildRow(airline, null)));
        applySearch();
    }

    function applySearch() {
        const query = dom.search.value.trim().toLowerCase();
        const rows = [...dom.list.children];

        let shown = 0;
        for (const row of rows) {
            const match = row.dataset.name.toLowerCase().includes(query);
            row.hidden = !match;
            if (match) shown++;
        }

        const total = rows.length;
        if (total === 0) {
            dom.summary.textContent = "No airlines accept this bag";
        } else if (query) {
            dom.summary.textContent = `${shown} of ${plural(total, "airline")} shown`;
        } else {
            dom.summary.textContent = `${plural(total, "airline")} accept${total === 1 ? "s" : ""} this bag`;
        }

        // When nothing is visible, say why, using the full list so that
        // "Ryanair" can report that Ryanair exists but is too small.
        dom.searchNote.hidden = shown > 0;
        if (shown === 0) {
            dom.searchNote.textContent = explainEmptyResults(query);
        }
    }

    function explainEmptyResults(query) {
        if (!query) {
            return "None of the airlines in our list have a cabin bag limit this big.";
        }
        const matches = airlines.filter((airline) => airline.name.toLowerCase().includes(query));
        if (matches.length === 1) {
            return `${matches[0].name} doesn't accept a bag this size (limit ${formatLimit(matches[0])}).`;
        }
        if (matches.length > 1) {
            return `None of the ${matches.length} matching airlines accept a bag this size.`;
        }
        return `No airline matching "${query}" is in our list.`;
    }

    // ---------- All-airlines sheet ----------

    function renderAllAirlines() {
        dom.sheetList.replaceChildren(
            ...airlines.map((airline) => buildRow(airline, bag ? fits(bag, airline) : null))
        );
        applySheetSearch();
    }

    function applySheetSearch() {
        const query = dom.sheetSearch.value.trim().toLowerCase();
        for (const row of dom.sheetList.children) {
            row.hidden = !row.dataset.name.toLowerCase().includes(query);
        }
    }

    // ---------- Startup and events ----------

    // The data comes from airlines.js, loaded by a plain <script> tag before this file.
    function loadAirlines() {
        if (!Array.isArray(window.AIRLINE_DIMENSIONS)) {
            throw new Error("airlines.js did not define AIRLINE_DIMENSIONS");
        }
        airlines = window.AIRLINE_DIMENSIONS
            .map(normalise)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Enter moves to the next field, and from the last field it closes the keyboard.
    function onDimensionKeydown(event) {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const inputs = Object.values(dom.inputs);
        const index = inputs.indexOf(event.currentTarget);
        if (index < inputs.length - 1) {
            inputs[index + 1].focus();
        } else {
            event.currentTarget.blur();
        }
    }

    function bindEvents() {
        for (const key of DIMENSION_KEYS) {
            dom.inputs[key].addEventListener("input", () => onDimensionInput(key));
            dom.inputs[key].addEventListener("keydown", onDimensionKeydown);
        }

        dom.unitButtons.forEach((button) => {
            button.addEventListener("click", () => setUnit(button.dataset.unit));
        });

        dom.search.addEventListener("input", applySearch);

        dom.openAll.addEventListener("click", () => {
            renderAllAirlines();
            dom.sheet.showModal();
            dom.sheetSearch.focus();
        });
        dom.sheetSearch.addEventListener("input", applySheetSearch);
        dom.sheet.querySelector("[data-close]").addEventListener("click", () => dom.sheet.close());
        // Clicks on the backdrop land on the <dialog> itself, because its content sits inside it.
        dom.sheet.addEventListener("click", (event) => {
            if (event.target === dom.sheet) dom.sheet.close();
        });
    }

    try {
        loadAirlines();
    } catch (error) {
        console.error("Could not load the airline list:", error);
        dom.status.textContent = "Couldn't load the airline list. Please refresh the page.";
        dom.status.classList.add("error");
        dom.status.hidden = false;
        dom.openAll.disabled = true;
        return;
    }

    bindEvents();
    update();

    // Autofocus only with a mouse or trackpad, so touch devices don't open the keyboard on load.
    if (window.matchMedia("(pointer: fine)").matches) {
        dom.inputs.height.focus();
    }
})();
