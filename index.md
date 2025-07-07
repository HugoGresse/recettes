---
layout: default
title: Recettes
---

# Recettes

Bienvenue sur l'index des recettes !

<ul>
  {% assign recipes = site.pages | where_exp: 'page', 'page.path contains "/" and page.path != "index.md"' %}
  {% for recipe in recipes %}
    <li>
      <a href="{{ recipe.url }}">{{ recipe.title | default: recipe.path }}</a>
    </li>
  {% endfor %}
</ul>
