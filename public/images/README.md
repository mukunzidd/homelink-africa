# Placeholder photography

Temporary local mock data, **not** production imagery.

Sourced from Unsplash under its licence (free for commercial use, no
attribution required). Every file here was opened and looked at before being
committed — none were taken on trust from a filename or an ID. Unsplash+ files
are excluded: they carry a different licence and arrive watermarked.

## Why these are temporary

HomeLink's verification promise is that our own team photographs every listing.
A stock photograph of a different property standing in for a "HomeLink-verified"
place is precisely the substitution the product exists to prevent. These files
are here so the interface can be judged against real photographs — contrast
behind the verified badge, legibility of overlaid text, how the mosaic reads —
and for nothing else.

## How close the subjects are

The experiences are shot in Rwanda: mountain gorillas in the Virunga bamboo,
Nyamirambo and the Kigali hills, pirogues and islands on Lake Kivu, the road
through Nyungwe and the tea that rings it. They are the right country and the
right subject, and still the wrong specific outing — a photograph of somebody
else's trek, not of ours.

The interiors are place-neutral and read fine anywhere. The vehicles are the
weakest set: they sit in deserts and snow, and one is not even the make it is
captioned as. They are next to replace.

Each experience carries five frames because that is what the mosaic holds.
Where a subject genuinely had no honest photograph, the frame is left to fall
back to its seeded panel rather than filled with a picture of somewhere else.

## Replacing them

`SupplyImage` is the only component that renders these. When the real shoot
lands, the files move to Supabase Storage and the fixture paths become storage
URLs; nothing else in the app changes.

Filenames are per subject, not per slot — `outing-4.jpg` once stood in for both
the gorilla trek and Nyungwe, which is how one European woodland ended up
serving two different Rwandan forests.

## Provenance

Unsplash photo IDs, so any of these can be traced back or re-fetched.

| File | Photo | Photographer |
| --- | --- | --- |
| `experiences/gorillas-1.jpg` | [-FezT2WMZr4](https://unsplash.com/photos/-FezT2WMZr4) | Magdalena Kula Manchee |
| `experiences/gorillas-2.jpg` | [iRCy13kFPwI](https://unsplash.com/photos/iRCy13kFPwI) | Emmy Shingiro |
| `experiences/gorillas-3.jpg` | [Q0Tcb9ZjO9w](https://unsplash.com/photos/Q0Tcb9ZjO9w) | Magdalena Kula Manchee |
| `experiences/gorillas-4.jpg` | [pEpeAiBzhAE](https://unsplash.com/photos/pEpeAiBzhAE) | Magdalena Kula Manchee |
| `experiences/gorillas-5.jpg` | [P0elkKyA31o](https://unsplash.com/photos/P0elkKyA31o) | Tamrat TOULOUMON |
| `experiences/kigali-1.jpg` | [K15V22xU1zs](https://unsplash.com/photos/K15V22xU1zs) | Protais Benjamin MUGENZI |
| `experiences/kigali-2.jpg` | [DjBuWgOw-xA](https://unsplash.com/photos/DjBuWgOw-xA) | Michael Muli |
| `experiences/kigali-3.jpg` | [2W7OWirnmQg](https://unsplash.com/photos/2W7OWirnmQg) | SHIMO yann |
| `experiences/kigali-4.jpg` | [Mu5wl2HdVh4](https://unsplash.com/photos/Mu5wl2HdVh4) | Protais Benjamin MUGENZI |
| `experiences/kigali-5.jpg` | [b-HnOOPRfTI](https://unsplash.com/photos/b-HnOOPRfTI) | Jean Claude Akarikumutima |
| `experiences/kivu-1.jpg` | [OYeYN7TmU-g](https://unsplash.com/photos/OYeYN7TmU-g) | Ifeoluwa B. |
| `experiences/kivu-2.jpg` | [y-ug2capYB0](https://unsplash.com/photos/y-ug2capYB0) | Tamrat TOULOUMON |
| `experiences/kivu-3.jpg` | [bVMnhNOfFCo](https://unsplash.com/photos/bVMnhNOfFCo) | Serrah Galos |
| `experiences/kivu-4.jpg` | [zDFIlyeGeP4](https://unsplash.com/photos/zDFIlyeGeP4) | Serrah Galos |
| `experiences/kivu-5.jpg` | [OQrOSZovusw](https://unsplash.com/photos/OQrOSZovusw) | Ifeoluwa B. |
| `experiences/nyungwe-1.jpg` | [cryqKSeLX74](https://unsplash.com/photos/cryqKSeLX74) | Faustin T |
| `experiences/nyungwe-2.jpg` | [2_NvpmYA8Mc](https://unsplash.com/photos/2_NvpmYA8Mc) | Tamrat TOULOUMON |
| `experiences/nyungwe-3.jpg` | [z-lNmXoXt-k](https://unsplash.com/photos/z-lNmXoXt-k) | maxime niyomwungeri |
| `experiences/nyungwe-4.jpg` | [u7mUyepYTlA](https://unsplash.com/photos/u7mUyepYTlA) | Tobias Doering |
| `experiences/nyungwe-5.jpg` | [kcNCqCEdwi8](https://unsplash.com/photos/kcNCqCEdwi8) | Tobias Doering |

The interiors and vehicles predate this table; their IDs were not recorded at
the time and are not recoverable from the files.
