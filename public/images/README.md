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

The home sets are covered under Homes below.

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

## Shot list for the fleet

What a real shoot needs to produce so the four cars read as one company's
fleet. Five frames per vehicle, because that is what the detail mosaic holds,
and the first frame is the one every result card shows.

| Frame | What | Why it is on the list |
| --- | --- | --- |
| 1 | Front three-quarter, driver's side, at standing eye height, on the same Kigali street for all four | The card image. Same angle and place is what makes four cars look like one fleet |
| 2 | Side profile, same spot | Shows length and doors, which is how people judge a 7- or 12-seater |
| 3 | Boot or rear load space, open, with a carry-on and a large suitcase in it | "Will our bags fit" is the question after "how many seats" |
| 4 | Cabin from the rear door, second row | Seat condition and legroom |
| 5 | Dashboard, engine on, odometer readable | The inspection claim: someone from the team drove this one |

Shoot all four on one morning in flat light (overcast, or before 09:00), on
a quiet street with Kigali's hills or red-earth verge behind, plates
legible, nothing branded in frame. Note each file's vehicle and plate in the
table below when it lands, so a frame can never drift to the wrong car.

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

The eight `listings/interior-N.jpg` files that predated this table were
removed once every home had its own set. Their IDs had never been recorded, so
there was no way to check what had been downloaded short of opening it, which
is the argument for keeping this table current.

Each car now shows only frames of one vehicle, because the detail page
says "this exact vehicle" and five different RAV4s under that sentence broke
the promise on the page that states it most plainly. The RAV4 keeps frames 1
and 4 (same plate), the Corolla 3 and 4 (same car, same forest road; the
seafront frame was another car in a landlocked country), and the Land Cruiser
and the HiAce keep one frame each. The rest stay on disk and in this table
for when a single-vehicle set replaces them; a matched set shot in Kigali
needs a real shoot.

## Homes

Each of the 18 stays and homes for sale has its own set in `homes/<slug>-N.jpg`,
so no room appears under two listings. Where one photographer shot several
rooms of the same building, those frames are kept together: the Nyarutarama
villa, the Rebero villa and the convention studio are each one property, and
the Gacuriro estate living room and bedroom are one Nairobi flat. The other
sets are matched by build, palette and light, not taken from a single house.

The subjects are close in kind and still the wrong place. The exteriors are
tropical and several are African (a Nairobi estate block, a brick bungalow on
a Kenyan lawn, West African apartment blocks for Kiyovu); others come from
Asia, Spain and Brazil. The interiors are place-neutral. Five sets carry three
frames: the Remera studio, the Kiyovu city flat and the Sonatubes flat
because they are small, and Kacyiru and the Kiyovu sale because the fourth
candidate showed autumn trees or a legible foreign-language label.

| File | Photo | Photographer |
| --- | --- | --- |
| `homes/kacyiru-garden-apartment-1.jpg` | [jzYccVkzqvU](https://unsplash.com/photos/jzYccVkzqvU) | Tim Wing |
| `homes/kacyiru-garden-apartment-2.jpg` | [m3Vq2LEAkfQ](https://unsplash.com/photos/m3Vq2LEAkfQ) | Collov Home Design |
| `homes/kacyiru-garden-apartment-3.jpg` | [7pCFUybP_P8](https://unsplash.com/photos/7pCFUybP_P8) | Minh Pham |
| `homes/kimihurura-townhouse-1.jpg` | [LJtUhEonruY](https://unsplash.com/photos/LJtUhEonruY) | Mạnh Ngô |
| `homes/kimihurura-townhouse-2.jpg` | [kjh70RMHDco](https://unsplash.com/photos/kjh70RMHDco) | Jonathan Borba |
| `homes/kimihurura-townhouse-3.jpg` | [YdomJdFdbDo](https://unsplash.com/photos/YdomJdFdbDo) | Jonathan Borba |
| `homes/kimihurura-townhouse-4.jpg` | [s2e8AiqYWOo](https://unsplash.com/photos/s2e8AiqYWOo) | Dinuka Lankaloka |
| `homes/nyarutarama-lake-villa-1.jpg` | [2d4lAQAlbDA](https://unsplash.com/photos/2d4lAQAlbDA) | Frames For Your Heart |
| `homes/nyarutarama-lake-villa-2.jpg` | [kToEIcYPky4](https://unsplash.com/photos/kToEIcYPky4) | Frames For Your Heart |
| `homes/nyarutarama-lake-villa-3.jpg` | [doSeeEgedZg](https://unsplash.com/photos/doSeeEgedZg) | Frames For Your Heart |
| `homes/nyarutarama-lake-villa-4.jpg` | [FqqiAvJejto](https://unsplash.com/photos/FqqiAvJejto) | Frames For Your Heart |
| `homes/remera-studio-1.jpg` | [3EariUCKobw](https://unsplash.com/photos/3EariUCKobw) | laura adai |
| `homes/remera-studio-2.jpg` | [kQjEq2bNFS0](https://unsplash.com/photos/kQjEq2bNFS0) | Christina Radevich |
| `homes/remera-studio-3.jpg` | [zSXM2gc4Ti4](https://unsplash.com/photos/zSXM2gc4Ti4) | Lisa Anna |
| `homes/kiyovu-city-apartment-1.jpg` | [GHCVUtBECuY](https://unsplash.com/photos/GHCVUtBECuY) | Michael Oxendine |
| `homes/kiyovu-city-apartment-2.jpg` | [pU69J8G0kAo](https://unsplash.com/photos/pU69J8G0kAo) | Alex Tyson |
| `homes/kiyovu-city-apartment-3.jpg` | [99XLWyMq_ns](https://unsplash.com/photos/99XLWyMq_ns) | Robert Arnar |
| `homes/gikondo-family-house-1.jpg` | [OuwYbntTpec](https://unsplash.com/photos/OuwYbntTpec) | Mạnh Ngô |
| `homes/gikondo-family-house-2.jpg` | [Vlo-6788S_M](https://unsplash.com/photos/Vlo-6788S_M) | Annie Spratt |
| `homes/gikondo-family-house-3.jpg` | [in7sEZFeqEs](https://unsplash.com/photos/in7sEZFeqEs) | Annie Spratt |
| `homes/gikondo-family-house-4.jpg` | [Ph2AIj8vOwo](https://unsplash.com/photos/Ph2AIj8vOwo) | Clay Banks |
| `homes/kicukiro-sonatubes-flat-1.jpg` | [4Q9aOJF-6vI](https://unsplash.com/photos/4Q9aOJF-6vI) | Prydumano Design |
| `homes/kicukiro-sonatubes-flat-2.jpg` | [DhFHtkECn7Q](https://unsplash.com/photos/DhFHtkECn7Q) | Sonnie Hiles |
| `homes/kicukiro-sonatubes-flat-3.jpg` | [beUkiHC-sF8](https://unsplash.com/photos/beUkiHC-sF8) | Dulkimso Hakim Santoso |
| `homes/nyamirambo-rooftop-flat-1.jpg` | [RLeA11D8J_U](https://unsplash.com/photos/RLeA11D8J_U) | Quang Tran |
| `homes/nyamirambo-rooftop-flat-2.jpg` | [8e679XbGGy4](https://unsplash.com/photos/8e679XbGGy4) | Spacejoy |
| `homes/nyamirambo-rooftop-flat-3.jpg` | [jbSTFmNG504](https://unsplash.com/photos/jbSTFmNG504) | Catherina Schürmann |
| `homes/nyamirambo-rooftop-flat-4.jpg` | [free3W2D_Ms](https://unsplash.com/photos/free3W2D_Ms) | Luisa Brimble |
| `homes/gacuriro-estate-apartment-1.jpg` | [e-oZ4yQelik](https://unsplash.com/photos/e-oZ4yQelik) | Kevin Menya |
| `homes/gacuriro-estate-apartment-2.jpg` | [76JYlSoAYM4](https://unsplash.com/photos/76JYlSoAYM4) | Cytonn Photography |
| `homes/gacuriro-estate-apartment-3.jpg` | [08ZgZuUwy2o](https://unsplash.com/photos/08ZgZuUwy2o) | Cytonn Photography |
| `homes/gacuriro-estate-apartment-4.jpg` | [xsWOJGv_2eI](https://unsplash.com/photos/xsWOJGv_2eI) | Steven Ungermann |
| `homes/kibagabaga-garden-bungalow-1.jpg` | [J25VGcZBPUE](https://unsplash.com/photos/J25VGcZBPUE) | david ouma |
| `homes/kibagabaga-garden-bungalow-2.jpg` | [9M66C_w_ToM](https://unsplash.com/photos/9M66C_w_ToM) | Spacejoy |
| `homes/kibagabaga-garden-bungalow-3.jpg` | [SXuLmYli53M](https://unsplash.com/photos/SXuLmYli53M) | Andrea Davis |
| `homes/kibagabaga-garden-bungalow-4.jpg` | [w1ylyAGtdiA](https://unsplash.com/photos/w1ylyAGtdiA) | Spacejoy |
| `homes/rebero-hilltop-house-1.jpg` | [gOcUODeHIhc](https://unsplash.com/photos/gOcUODeHIhc) | Polina Kuzovkova |
| `homes/rebero-hilltop-house-2.jpg` | [TIgbwVzjQ80](https://unsplash.com/photos/TIgbwVzjQ80) | Polina Kuzovkova |
| `homes/rebero-hilltop-house-3.jpg` | [7401sXEEegA](https://unsplash.com/photos/7401sXEEegA) | Polina Kuzovkova |
| `homes/rebero-hilltop-house-4.jpg` | [FOd_Ay1hJYQ](https://unsplash.com/photos/FOd_Ay1hJYQ) | Polina Kuzovkova |
| `homes/kimihurura-convention-studio-1.jpg` | [NoPzk4m4jHc](https://unsplash.com/photos/NoPzk4m4jHc) | Aquilion Property |
| `homes/kimihurura-convention-studio-2.jpg` | [1EJXSLUfqU0](https://unsplash.com/photos/1EJXSLUfqU0) | Aquilion Property |
| `homes/kimihurura-convention-studio-3.jpg` | [qbhF5gOzhVU](https://unsplash.com/photos/qbhF5gOzhVU) | Aquilion Property |
| `homes/kimihurura-convention-studio-4.jpg` | [KUG5LLnuTbo](https://unsplash.com/photos/KUG5LLnuTbo) | Aquilion Property |
| `homes/gacuriro-four-bedroom-house-1.jpg` | [yEwC3w6biTA](https://unsplash.com/photos/yEwC3w6biTA) | Sam E |
| `homes/gacuriro-four-bedroom-house-2.jpg` | [DxM82rpy_6Q](https://unsplash.com/photos/DxM82rpy_6Q) | Caroline Badran |
| `homes/gacuriro-four-bedroom-house-3.jpg` | [IcdvygLEzHU](https://unsplash.com/photos/IcdvygLEzHU) | Caroline Badran |
| `homes/gacuriro-four-bedroom-house-4.jpg` | [IARlbQa6Kc8](https://unsplash.com/photos/IARlbQa6Kc8) | Spacejoy |
| `homes/kimihurura-three-bedroom-apartment-1.jpg` | [WxEJYXMDYaE](https://unsplash.com/photos/WxEJYXMDYaE) | ERFAN HUSSAIN |
| `homes/kimihurura-three-bedroom-apartment-2.jpg` | [Ci0LxMd5AOQ](https://unsplash.com/photos/Ci0LxMd5AOQ) | Michael Alake |
| `homes/kimihurura-three-bedroom-apartment-3.jpg` | [BdZPID68yjM](https://unsplash.com/photos/BdZPID68yjM) | Emmanuel Ikwuegbu |
| `homes/kimihurura-three-bedroom-apartment-4.jpg` | [OkUd53qusu8](https://unsplash.com/photos/OkUd53qusu8) | Franco Debartolo |
| `homes/kicukiro-townhouse-for-sale-2.jpg` | [p-pVu8FKTxI](https://unsplash.com/photos/p-pVu8FKTxI) | Steven Ungermann |
| `homes/kicukiro-townhouse-for-sale-3.jpg` | [arjqEzUMRbA](https://unsplash.com/photos/arjqEzUMRbA) | Andrea Davis |
| `homes/kicukiro-townhouse-for-sale-4.jpg` | [I2v0DV-jqi8](https://unsplash.com/photos/I2v0DV-jqi8) | Alex Tyson |
| `homes/rebero-villa-for-sale-1.jpg` | [FAE02RMBEjQ](https://unsplash.com/photos/FAE02RMBEjQ) | Alef Morais |
| `homes/rebero-villa-for-sale-2.jpg` | [LtlBlCal4Fw](https://unsplash.com/photos/LtlBlCal4Fw) | Alef Morais |
| `homes/rebero-villa-for-sale-3.jpg` | [RIbx4WEQ0rg](https://unsplash.com/photos/RIbx4WEQ0rg) | Alef Morais |
| `homes/rebero-villa-for-sale-4.jpg` | [nq24NfTPU8c](https://unsplash.com/photos/nq24NfTPU8c) | Alef Morais |
| `homes/kibagabaga-family-house-for-sale-1.jpg` | [W9NgQjRX7ZE](https://unsplash.com/photos/W9NgQjRX7ZE) | Anoop Surendran |
| `homes/kibagabaga-family-house-for-sale-2.jpg` | [NFbwes_e-jI](https://unsplash.com/photos/NFbwes_e-jI) | Don Kaveen |
| `homes/kibagabaga-family-house-for-sale-3.jpg` | [zCvlyeUfALc](https://unsplash.com/photos/zCvlyeUfALc) | Clay Banks |
| `homes/kiyovu-two-bedroom-apartment-for-sale-1.jpg` | [-W9baa2VIBU](https://unsplash.com/photos/-W9baa2VIBU) | Joshua Oluwagbemiga |
| `homes/kiyovu-two-bedroom-apartment-for-sale-2.jpg` | [0tl4Ju7tlYY](https://unsplash.com/photos/0tl4Ju7tlYY) | Habila Mazawaje |
| `homes/kiyovu-two-bedroom-apartment-for-sale-3.jpg` | [mq0oUJRQTaQ](https://unsplash.com/photos/mq0oUJRQTaQ) | Mustafa Omar |
