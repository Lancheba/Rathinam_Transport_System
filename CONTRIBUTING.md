# Contributing

## Pagination convention (read this before adding a new ViewSet)

`REST_FRAMEWORK` in `config/settings.py` deliberately has **no**
`DEFAULT_PAGINATION_CLASS`. A global `PageNumberPagination` default was tried
once and silently wrapped every list endpoint's response in
`{count, next, previous, results}` — it broke 19 backend tests and the
frontend (`x.forEach is not a function`) the moment it shipped, because no
view, test, or frontend call site expected an envelope.

Instead, each `ViewSet` is responsible for its own list size:

- **Endpoints that can grow without bound or are attacker/user-influenced**
  (announcements, feedback, link requests) MUST cap their `get_queryset()`
  with an explicit `LIST_LIMIT` slice, e.g. `qs[:LIST_LIMIT]`. See
  `announcements/views.py` (`LIST_LIMIT = 50`) or `feedback/views.py`
  (`LIST_LIMIT = 500`) for the pattern.
- **Endpoints backed by naturally small, institution-scale tables**
  (buses, teachers, students, parking grounds/slots, sensors, maintenance
  logs — bounded by real-world counts like "number of buses this college
  runs", not by how many rows a user can create) are allowed to return
  their full queryset unpaginated. These are listed explicitly in
  `utils/tests_pagination_convention.py::EXPECTED_UNCAPPED` together with
  the reason each is considered bounded.

**When you add a new `ModelViewSet` and register it on a router:**

1. Decide which category it falls into.
2. If it can grow unboundedly, cap it in `get_queryset()` the same way
   `announcements`/`feedback` do.
3. If it's naturally bounded, add its `(app_label, class_name)` to
   `EXPECTED_UNCAPPED` in `utils/tests_pagination_convention.py` with a
   one-line reason — this is what makes the omission a deliberate,
   reviewable choice instead of an accident.

`utils/tests_pagination_convention.py` runs in CI and fails if a new
router-registered `ModelViewSet`/`ReadOnlyModelViewSet` shows up that is
neither capped nor explicitly allow-listed, so this can't silently slip
through review.
