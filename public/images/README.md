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

The interiors are place-neutral and read fine anywhere.

The vehicles are now the right make and the right model, five frames each, and
each set reads as one car rather than five. Not one of the four they replaced
was the make it was captioned as: a Ford Expedition in a red-rock desert stood
in for the RAV4, a Volkswagen Polo for the Corolla, a Honda CR-V on Icelandic
snow for the Land Cruiser, and a blue Chevrolet Camaro — a two-door coupé —
for the twelve-seat HiAce.

They are closest on the Land Cruiser, where the subject and the use are both
right — open-sided game-drive vehicles in East African savanna, and the view
from inside one, which is what "comes with a driver" actually looks like. The
Corolla and the RAV4 are the right model in the wrong country: white saloons
and grey crossovers, in forests and by water that could be most places. The
HiAce sits in between, in southern and eastern Africa.

Two candidates were dropped after being looked at rather than after being
searched for. Both were fine RAV4 photographs taken on a dealer forecourt with
`TAVAN BOGD` and `MONGOLIA` printed across the plate in letters large enough to
read at gallery size. A stock car is a stand-in; a stock car with another
country's dealer name on it is a contradiction of the sentence directly above
it on the page.

Each vehicle and each experience carries five frames because that is what the
mosaic holds. Where a subject genuinely had no honest photograph, the frame is
left to fall back to its seeded panel rather than filled with a picture of
somewhere else.

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
| `cars/rav4-1.jpg` | [-PMNMWIYIF0](https://unsplash.com/photos/-PMNMWIYIF0) | Gino Marcelo Hernandez Sanchez |
| `cars/rav4-2.jpg` | [qHYYjeihoig](https://unsplash.com/photos/qHYYjeihoig) | Agshin Osmanov |
| `cars/rav4-3.jpg` | [UKz-UD0CqTA](https://unsplash.com/photos/UKz-UD0CqTA) | James Hardman |
| `cars/rav4-4.jpg` | [MN0-x2hDNrc](https://unsplash.com/photos/MN0-x2hDNrc) | Gino Marcelo Hernandez Sanchez |
| `cars/rav4-5.jpg` | [-7Gys8mZ1oE](https://unsplash.com/photos/-7Gys8mZ1oE) | Liao Je Wei |
| `cars/landcruiser-1.jpg` | [GxU80twc7KA](https://unsplash.com/photos/GxU80twc7KA) | Meg von Haartman |
| `cars/landcruiser-2.jpg` | [aXLWnXYWAu0](https://unsplash.com/photos/aXLWnXYWAu0) | Aden Heeremans |
| `cars/landcruiser-3.jpg` | [WQRdXOBJLV0](https://unsplash.com/photos/WQRdXOBJLV0) | redcharlie |
| `cars/landcruiser-4.jpg` | [0z4ZI9fdQiM](https://unsplash.com/photos/0z4ZI9fdQiM) | Mark Stoop |
| `cars/landcruiser-5.jpg` | [FGqy6PbvxD0](https://unsplash.com/photos/FGqy6PbvxD0) | Mario Scheibl |
| `cars/corolla-1.jpg` | [73XAgT8DOpo](https://unsplash.com/photos/73XAgT8DOpo) | Bestami Sarıkaya |
| `cars/corolla-2.jpg` | [PBbP1bOZV1o](https://unsplash.com/photos/PBbP1bOZV1o) | Lucas Hunter |
| `cars/corolla-3.jpg` | [DwNmXuRb1Tk](https://unsplash.com/photos/DwNmXuRb1Tk) | Bestami Sarıkaya |
| `cars/corolla-4.jpg` | [u6UfP9-aNv4](https://unsplash.com/photos/u6UfP9-aNv4) | Bestami Sarıkaya |
| `cars/corolla-5.jpg` | [MGMrQYGZXdI](https://unsplash.com/photos/MGMrQYGZXdI) | Grégory Dupont |
| `cars/hiace-1.jpg` | [F4o_phtVg8o](https://unsplash.com/photos/F4o_phtVg8o) | Sipho Ndebele |
| `cars/hiace-2.jpg` | [BqYAS7Sl5kU](https://unsplash.com/photos/BqYAS7Sl5kU) | Sam Mamabolo |
| `cars/hiace-3.jpg` | [K59l2Aly3h8](https://unsplash.com/photos/K59l2Aly3h8) | Visual Karsa |
| `cars/hiace-4.jpg` | [lGOAzV8s_ko](https://unsplash.com/photos/lGOAzV8s_ko) | Kenneth Sonntag |
| `cars/hiace-5.jpg` | [6SlIB057YQs](https://unsplash.com/photos/6SlIB057YQs) | Ewien van Bergeijk - Kwant |

The interiors predate this table; their IDs were not recorded at the time and
are not recoverable from the files. The four vehicles that used to sit here had
the same gap, so there was no way to check what had been downloaded short of
opening it — which is the argument for keeping this table current.
