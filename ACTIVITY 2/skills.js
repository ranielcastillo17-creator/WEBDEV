(function () {
    "use strict";

    var JSON_URL = "skills.json";
    var container = document.getElementById("skillsContainer");

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function renderSkill(skill) {
        var card = el("div", "skill-item");

        var img = el("img", "skill-item__img");
        img.src = skill.image;
        img.alt = skill.name;
        img.width = 80;
        img.height = 80;
        img.loading = "lazy";
        img.addEventListener("error", function () {
            img.remove();
            card.classList.add("skill-item--noimg");
        });

        card.appendChild(img);
        card.appendChild(el("span", "skill-item__name neon-font", skill.name));
        return card;
    }

    function renderCategory(category) {
        var col = el("div", "col-lg-6 mb-5");
        col.appendChild(el("h3", "h4 fw-bold mb-4 grotesque-font", category.title));

        var list = el("div", "d-flex flex-wrap gap-4");
        (category.skills || []).forEach(function (skill) {
            list.appendChild(renderSkill(skill));
        });

        col.appendChild(list);
        return col;
    }

    function showMessage(text) {
        container.innerHTML = "";
        var msg = el("p", "skills-message neon-font", text);
        msg.setAttribute("role", "status");
        container.appendChild(msg);
    }

    fetch(JSON_URL)
        .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(function (data) {
            var categories = data.categories || [];
            if (!categories.length) {
                showMessage("No skills added yet. Add entries to skills.json.");
                return;
            }
            container.innerHTML = "";
            categories.forEach(function (c) {
                container.appendChild(renderCategory(c));
            });
        })
        .catch(function (err) {
            console.error("Could not load skills:", err);
            showMessage("Skills could not be loaded. Check that skills.json exists and open this page through a web server, not file://.");
        });
})();
