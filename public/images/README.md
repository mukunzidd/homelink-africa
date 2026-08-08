# Placeholder photography

Temporary local mock data, **not** production imagery.

Sourced from Unsplash under its licence (free for commercial use, no
attribution required). Every file here was opened and looked at before being
committed — none were taken on trust from a filename or an ID.

## Why these are temporary

HomeLink's verification promise is that our own team photographs every listing.
A stock photograph of a different property standing in for a "HomeLink-verified"
place is precisely the substitution the product exists to prevent. These files
are here so the interface can be judged against real photographs — contrast
behind the verified badge, legibility of overlaid text, how the mosaic reads —
and for nothing else.

Subjects are approximate. The interiors are place-neutral and read fine. The
vehicles sit in deserts and snow, and the wildlife is savanna rather than
Volcanoes or Nyungwe. That is acceptable in local development and is not
acceptable in anything a customer sees.

## Replacing them

`SupplyImage` is the only component that renders these. When the real shoot
lands, the files move to Supabase Storage and the fixture paths become storage
URLs; nothing else in the app changes.
