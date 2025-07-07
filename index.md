---
layout: default
title: Recettes
---

# Recettes

Bienvenue sur l'index des recettes !

<ul>
  {% for page in site.pages %}
    {% if page.path contains "/" and page.path contains ".md" and page.path != "index.md" %}
      <li>
        <a href="{{ page.url | relative_url }}">{{ page.title | default: page.path }}</a>
      </li>
    {% endif %}
  {% endfor %}
</ul>
