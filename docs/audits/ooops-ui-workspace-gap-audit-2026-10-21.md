# Audit κενών του Ooops UI για σταδιακή υιοθέτηση από το Workspace

> Ενημέρωση 21/10/2026: τα F01–F06 και οι έξι επόμενες προτεραιότητες υλοποιήθηκαν και πέρασαν πλήρες `validate:release`. Οι ενότητες 1–11 διατηρούν το αρχικό audit· η τρέχουσα κατάσταση περιγράφεται στις 12–14.

Ημερομηνία: 21 Οκτωβρίου 2026. Έλεγχος των τοπικών checkouts, χωρίς αλλαγή production ή δημοσίευση πακέτων.

## 1. Συμπέρασμα

Το `ooops-ui` έχει χρήσιμη αρχιτεκτονική: framework-independent controllers, Svelte/Astro adapters, typed APIs, δοκιμές keyboard/focus και εργαλεία ελέγχου των packages. Δεν είναι όμως ακόμη πλήρης αντικατάσταση του ιδιωτικού UI του Workspace.

Πριν από ευρεία μεταφορά χρειάζονται:

1. Διόρθωση των αναπαραγόμενων προβλημάτων κατάστασης, callbacks, SSR και native forms.
2. Συμπλήρωση των APIs των controls, ιδίως native attributes, events, accessible naming και element refs.
3. Σταθερό συμβόλαιο markup/styling και ισοδυναμία συμπεριφοράς μεταξύ Astro και Svelte.
4. Πρόσθετες δυνατότητες στα overlays, ώστε να εξυπηρετούν τα υπάρχοντα anchors και focus boundaries του Workspace.
5. Μικρά, ελεγχόμενα pilots πριν από αντικατάσταση κεντρικών wrappers.

Το ότι ένα component έχει ίδιο όνομα ή πράσινα υπάρχοντα tests δεν αρκεί ως τεκμήριο ισοδυναμίας.

## 2. Scope, εκδόσεις και μέθοδος

### Checkouts

| Στοιχείο | Ελεγμένη κατάσταση |
|---|---|
| `ooops-ui` | Τοπικό `main`, commit `a54be0b`, αρχικά καθαρό working tree |
| `@ooopsstudio/ui-primitives` | Manifest version `0.3.0` |
| `@ooopsstudio/ui-svelte` | Manifest version `0.2.1` |
| Workspace | Τοπικό `main`, commit `01267eac4`, με προϋπάρχουσες αλλαγές |
| Workspace UI | Ιδιωτικό `@ooopsstudio/ui`, συν `@ooopsstudio/app-ui` και shared components |
| Περιβάλλον δοκιμών | Node `22.22.1`, pnpm `11.13.1` στο `ooops-ui` |

Οι παραπάνω είναι τοπικές εκδόσεις των manifests, όχι νέα επιβεβαίωση του npm ή του remote main. Το Workspace lockfile περιέχει ήδη έμμεσα `ui-svelte@0.1.1` / `ui-primitives@0.1.0`, μέσω accessibility. Δεν πρέπει να θεωρηθεί ότι ήδη καταναλώνει το API που ελέγχεται εδώ.

### Τι ελέγχθηκε

- Οι εξαγωγές των UI packages και τα APIs των Svelte adapters.
- Controllers για forms, choices, navigation, overlays και layers.
- Στοχευμένη αντιπαραβολή με Astro markup/runtime και Workspace callers.
- Οι υπάρχουσες δοκιμές, feature matrix, AT protocol και οδηγίες αρχιτεκτονικής.
- Πρόσθετα εκτελέσιμα probes σε Svelte/jsdom και πραγματική παραγωγή SSR HTML με τον Svelte compiler/server renderer.

Δεν εκτελέστηκε το πλήρες `validate:release`, browser E2E/visual/stress suite ή χειροκίνητος έλεγχος VoiceOver/NVDA. Τα scene packages δεν αποτελούν αντικείμενο του παρόντος audit. Η τεκμηρίωση διακρίνει αναπαραγωγή, στατική ένδειξη και προτεινόμενη επέκταση.

## 3. Αποτελέσματα επαλήθευσης

| Έλεγχος | Αποτέλεσμα |
|---|---|
| Υπάρχοντα tests `ui-primitives` | 62/62 πέρασαν |
| Υπάρχοντα tests `ui-svelte` | 5/5 πέρασαν |
| Υπάρχοντα tests `ui-astro` | 3/3 πέρασαν |
| Svelte package typecheck | Πέρασε |
| Astro package check | 28 αρχεία, 0 errors / warnings / hints στο τελικό αποτέλεσμα |
| Πρόσθετα desired-behavior probes | 9 αποτυχίες και 1 επιτυχία, σε 10 tests |
| SSR probes Checkbox / Switch | Και τα δύο παρέλειψαν το native `checked` με `checked=true` |
| Feature coverage checker | Πέρασε: 11 features |
| AT protocol checker | Πέρασε: 3 περιβάλλοντα, 18 components· ελέγχει το πρωτόκολλο, όχι πραγματική εκτέλεση AT |

Οι 9 αποτυχίες των πρόσθετων probes είναι σκόπιμες assertions της επιθυμητής συμπεριφοράς και τεκμηριώνουν ευρήματα. Δεν είναι αποτυχίες της προϋπάρχουσας suite και δεν αντιστοιχούν σε 9 ανεξάρτητες αιτίες. Οι προσωρινές δοκιμές αφαιρέθηκαν από το test discovery· αντίγραφο και logs διατηρούνται στον φάκελο evidence.

## 4. Αναπαραγόμενα προβλήματα

Σημασία προτεραιοτήτων: **P1** πριν από migration που επηρεάζει εγγραφή δεδομένων ή hydration, **P2** πριν από γενικευμένη χρήση του σχετικού component, **P3** τεκμηρίωση/συνέπεια. Η αξιολόγηση αφορά την ενσωμάτωση στο Workspace, όχι CVSS ή διαπίστωση κενού εξουσιοδότησης.

### F01 — P1: Input / Textarea χάνουν callback μετά από εξωτερική ενημέρωση

**Κατάσταση:** αναπαράχθηκε σε δύο probes.

Βήματα: αρχική τιμή `A` → ο parent ενημερώνει το prop σε `B` → ο χρήστης γράφει `A`. Το native control επιστρέφει στο `A`, αλλά το `onChange('A')` δεν καλείται.

Η μεταβλητή `lastEmittedValue` παραμένει στο αρχικό `A` και δεν ακολουθεί την εξωτερική ενημέρωση. Το deduplication απορρίπτει έτσι μια πραγματική επεξεργασία. Αυτό μπορεί να χαθεί από dirty tracking, autosave ή analytics που βασίζονται στο callback, ακόμη κι αν ένα binding ενημερώνεται.

**Πηγές:** `packages/ui-svelte/src/lib/Input.svelte:12–18`, `Textarea.svelte:9–15`.

**Κριτήριο διόρθωσης:** εξωτερική τιμή, πληκτρολόγηση, reset και clear να έχουν καθορισμένο συμβόλαιο· κάθε πραγματική ενέργεια χρήστη να εκπέμπει ακριβώς μία φορά. Να προστεθεί regression test `A → parent B → user A` και στα δύο adapters.

### F02 — P1: Checkbox / Switch δεν προβάλλουν το checked στο SSR HTML

**Κατάσταση:** επιβεβαιώθηκε με server compilation/rendering των Svelte components.

Με `checked=true`, το HTML περιέχει `data-state="checked"` ή `"on"`, αλλά το `<input type="checkbox">` δεν έχει `checked`. Ο controller διορθώνει το DOM μόνο στο mount. Πριν από το hydration η native κατάσταση και η δηλωμένη κατάσταση διαφέρουν· χωρίς JS δεν αποστέλλεται η αναμενόμενη checked τιμή.

**Πηγές:** `packages/ui-svelte/src/lib/Checkbox.svelte:20`, `Switch.svelte:16`. Το Astro Checkbox ήδη αποδίδει `{checked}` στο native input.

**Κριτήριο διόρθωσης:** σωστή server projection, σωστό switch role και ρητός χειρισμός επεξεργασίας πριν από το hydration. Browser test με καθυστερημένο JS και SSR test με checked/unchecked τιμές. Η πιθανή απώλεια pre-hydration edit είναι επόμενο σενάριο προς έλεγχο, όχι ήδη εκτελεσμένη browser αναπαραγωγή.

### F03 — P2: Disabled composite controls εξακολουθούν να αποστέλλουν τιμές

**Κατάσταση:** αναπαράχθηκε μέσω `FormData` για Svelte MultiSelect, Combobox, SegmentedControl και Slider.

Το ορατό control απενεργοποιείται, αλλά τα hidden inputs παραμένουν ενεργά. Ενδεικτικά, disabled MultiSelect με `values=['a']` δίνει `tags[]=['a']`, ενώ disabled Slider δίνει `volume='20'`.

**Πηγές:** `MultiSelect.svelte:27`, `Combobox.svelte:39`, `SegmentedControl.svelte:19`, `Slider.svelte:30`.

**Κριτήριο διόρθωσης:** κοινό native-form contract και `disabled` σε όλες τις projections. Έλεγχος enable/disable, scalar/array values και FormData και στους δύο adapters. Το Astro SegmentedControl έχει επίσης hidden input χωρίς disabled, ως στατική ένδειξη αντίστοιχου κενού.

Αυτό είναι ασυνέπεια συμπεριφοράς φόρμας. Το disabled UI δεν αποτελεί μηχανισμό εξουσιοδότησης και ο server οφείλει ανεξάρτητο έλεγχο.

### F04 — P2: Το clear παρακάμπτει το readonly του Input

**Κατάσταση:** αναπαράχθηκε σε Svelte/jsdom.

`value='Locked', readonly=true, clearable=true` → click στο clear → τιμή `''`. Το clear ελέγχει disabled/κενή τιμή αλλά όχι readonly.

**Πηγή:** `packages/ui-svelte/src/lib/Input.svelte:34`.

**Κριτήριο διόρθωσης:** καμία ενέργεια που αλλάζει την τιμή όταν είναι readonly. Να ελεγχθεί επίσης ο Astro clear handler, που καλεί απευθείας `controller.setValue('', true)` στο `packages/ui-astro/src/runtime/forms.ts`.

### F05 — P2: RadioGroup δεν συγχρονίζει επιλογή μετά από form.reset()

**Κατάσταση:** αναπαράχθηκε με το component εξαρχής μέσα σε φόρμα.

Αρχικό `a` → επιλογή `b` και επιβεβαίωση του selected markup → `form.reset()` → το Svelte selected state παραμένει στο `b`. Ο κοινός choice controller δεν συνδέεται με το reset της φόρμας, σε αντίθεση με text και checkbox controllers.

**Πηγή:** `packages/ui-primitives/src/form-controls.ts:215–315`.

**Κριτήριο διόρθωσης:** συμφωνία controller state, Svelte binding, selected styling, native values και accessibility state μετά από reset. Να οριστεί αν reset εκπέμπει callback. Να ελεγχθούν επίσης SegmentedControl, NumberInput, Slider και selection controls, χωρίς να θεωρηθούν όλα ήδη αναπαραγόμενα failures.

### F06 — P2: Accordion αλλάζει data-type, αλλά κρατά την παλιά λειτουργία

**Κατάσταση:** αναπαράχθηκε για `type='single' → 'multiple'`.

Μετά την αλλαγή του prop, το markup δηλώνει multiple, αλλά το άνοιγμα δεύτερου panel κλείνει το πρώτο. Ο adapter δεν μεταφέρει την αλλαγή στον controller και ο controller χρησιμοποιεί τις αρχικές επιλογές. Η δυναμική προσθήκη item, αντίθετα, πέρασε το αντίστοιχο probe.

**Πηγές:** `packages/ui-svelte/src/lib/Accordion.svelte:9–10`, `packages/ui-primitives/src/navigation.ts:154–196`.

**Κριτήριο διόρθωσης:** reactive configuration για type/collapsible ή ρητή τεκμηρίωση immutable options και ασφαλής remount στρατηγική. Το DOM δεν πρέπει να δηλώνει λειτουργία διαφορετική από την πραγματική.

## 5. Κενά APIs που εμποδίζουν το migration

### G01 — P1 για επεξεργάσιμες φόρμες: native attributes, events και refs

Το Svelte Input δεν εκθέτει το πλήρες συμβόλαιο του σημερινού Workspace InputField:

| Ανάγκη Workspace | Κατάσταση ooops-ui | Επίπτωση |
|---|---|---|
| `onBlur`, `onFocus`, `onKeydown`, native event context | Δεν εκτίθενται από το Input API | Autosave, shortcuts, focus flows |
| `maxlength`, `minlength`, `pattern`, `inputmode`, `list`, `spellcheck`, `tabindex`, `form` | Δεν εκτίθενται όλα | Validation, mobile keyboards, εξωτερικές φόρμες |
| Element ref / imperative focus/select | Δεν υπάρχει δημόσιο ref contract | Εστίαση μετά από errors ή commands |
| `ariaLabel`, εξωτερικό `aria-describedby` / `aria-labelledby` | Περιορισμένα ή εσωτερικά παραγόμενα | Controls με εξωτερικές ετικέτες |
| `string | number` στο υφιστάμενο InputField | `string` στο νέο Input· χωριστό NumberInput | Απαιτείται συνειδητή μετατροπή τιμών |
| `onInput(Event)` | `onChange(value)` | Διαφορετικό payload και όνομα· χρειάζεται adapter |

**Πηγές:** `packages/ui-svelte/src/lib/Input.svelte:5`, `Textarea.svelte:4`, έναντι Workspace `packages/ui/src/input-field.shared.ts` / `textarea-field.shared.ts`.

**Πρόταση:** typed forwarding native attributes στο πραγματικό control, ασφαλές ref/focus API και τεκμηριωμένα value/native-event callbacks. Το `class` στον εξωτερικό wrapper ή το `Part` δεν υποκαθιστά πρόσβαση στο εσωτερικό input. Τα numeric controls χρειάζονται επίσης τεκμηριωμένη διάκριση raw text, empty/null και committed number.

### G02 — P2: ασυνεπές accessible naming

Το Switch απαιτεί μέσω union `label` ή `ariaLabel`. Πολλά άλλα controls επιτρέπουν προαιρετικό label χωρίς αντίστοιχο δημόσιο ariaLabel/aria-labelledby. Το RadioGroup απαιτεί name αλλά το Workspace χρησιμοποιεί και ομάδες με ariaLabel χωρίς name, όπως η επιλογή θέματος.

**Πρόταση:** κοινό naming contract με visible ή εξωτερική ετικέτα, χωρίς να απαιτείται αλλαγή σχεδίασης. Tests με label εκτός component και συνύπαρξη description, hint, error. Δεν χαρακτηρίζονται όλες οι σημερινές χρήσεις απροσπέλαστες: το κενό είναι ότι το API δεν καλύπτει αξιόπιστα όλες τις νόμιμες χρήσεις του consumer.

### G03 — P2: Field / validation δεν αποτελούν ολοκληρωμένο adapter contract

Υπάρχουν `createFieldController` / `createFormController` και Standard Schema υποστήριξη στα primitives. Το Svelte Field είναι κυρίως markup: `data-control-id`, label και μηνύματα. Δεν συνδέει αυτομάτως το child με τα generated description/error IDs και δεν ενσωματώνει validation lifecycle.

**Πηγές:** `packages/ui-svelte/src/lib/Field.svelte`, `packages/ui-primitives/src/validation.ts`.

**Πρόταση:** είτε field context/slot props με control attributes είτε σαφής συνταγή χειροκίνητης σύνδεσης. Ρητό συμβόλαιο touched/dirty/pending, async validation, submit focus και reset. Το υπάρχον Workspace FormField περιλαμβάνει επιπλέον loading, password UI και editor/presence metadata· αυτά παραμένουν ευθύνη του Workspace wrapper.

### G04 — P2: Popover / DropdownMenu δεσμεύουν τον consumer σε δικό τους trigger

Το Workspace ανοίγει menus πάνω σε εξωτερικά `anchorEl`, έχει αυθαίρετο περιεχόμενο, πλάτος στήλης, menu coordination και focus portals μέσα σε dialogs. Το νέο Svelte Popover δημιουργεί δικό του button· το DropdownMenu βασίζεται σε items. Το trigger snippet αποδίδεται μέσα στο button, άρα δεν είναι ασφαλές να τοποθετηθεί εκεί ένα έτοιμο IconButton που επίσης αποδίδει button.

**Πηγές:** `packages/ui-svelte/src/lib/Popover.svelte:7–44`, `DropdownMenu.svelte:6–19`, Workspace `packages/ui/src/DropdownMenu.svelte`.

Ο layer controller έχει ήδη δυνατότητες όπως zIndex, matchAnchorWidth και portal root, αλλά δεν εκτίθενται όλες από adapters/controller wrappers. Αυτό είναι κυρίως κενό δημόσιου API.

**Πρόταση:** external anchor ή ασφαλές trigger composition contract, controlled open, portal container, width/offset/z-index, focus ownership και δυνατότητα veto κλεισίματος όπου απαιτείται. Καμία εισαγωγή selectors του Workspace στα primitives.

### G05 — P2: Dialog / Modal δεν καλύπτουν ακόμη όλα τα υπάρχοντα flows

Το Dialog διαθέτει busy και βασικές confirm/cancel ενέργειες. Το Modal διαθέτει children/footer, αλλά όχι αντίστοιχο busy/close-veto contract. Δεν εκτίθενται γενικά εξωτερικό restore-focus target και initial-focus επιλογή. Το Workspace έχει επίσης sticky wizard footer, nested menus, dismissible states και context-change guards.

**Πηγές:** `packages/ui-svelte/src/lib/Dialog.svelte:5–43`, `Modal.svelte`, `packages/ui-primitives/src/dialog.ts`· Workspace `packages/app-ui/src/AppDialog.svelte` / `AppDrawer.svelte`.

**Πρόταση:** γενικά callbacks/options για close lifecycle και focus, διατηρώντας persistence, routing guards και wizard state στο Workspace. Η async confirm δεν πρέπει να θεωρείται αυτόματο κλείδωμα όλων των παράλληλων ενεργειών· χρειάζεται ρητό busy/error contract και δοκιμή διπλής ενεργοποίησης.

### G06 — P2: Tabs δεν είναι ακόμη drop-in για AppTabs

Το AppTabs υποστηρίζει badges, navigation/button περιπτώσεις και εξωτερικό panelId. Το νέο Tabs διαχειρίζεται δικά του panels, διαφορετικά item IDs και activation modes. Η αντιστοίχιση requires ξεχωριστό navigation-only και panels-controlled pilot.

**Πηγές:** `packages/ui-svelte/src/lib/Tabs.svelte`, Workspace `packages/app-ui/src/AppTabs.svelte`.

### G07 — P2: selection/menu conventions χρειάζονται σταθεροποίηση

- Select callback: detail object, έναντι string στο σημερινό Workspace Select.
- MultiSelect callback: readonly array· naming projection `name[]` πρέπει να συμφωνηθεί με backend consumers.
- Svelte MultiSelect εμφανίζει πάντα select-all/clear actions, ενώ Astro διαθέτει showSelectAll/showClear props.
- Τα DropdownMenuItem types επιτρέπουν αναδρομικά children, αλλά το έτοιμο Svelte markup αποδίδει μόνο ένα επίπεδο submenu. Χρειάζεται δηλωμένο όριο ή αναδρομική υλοποίηση.
- Τα checkbox/radio menu items αλλάζουν DOM state στον controller· πρέπει να τεκμηριωθεί πώς ο consumer ενημερώνει και το items model, ώστε επόμενο render να μη διαφωνεί με το DOM.

Αυτά είναι κενά συμβολαίου/δυνατοτήτων βάσει πηγών. Δεν παρουσιάζονται όλα ως ήδη αναπαραγόμενα runtime bugs.

## 6. Ισοδυναμία adapters και styling

### G08 — P2: διαφορές Astro / Svelte

| Περιοχή | Παρατήρηση |
|---|---|
| Checkbox SSR | Το Astro αποδίδει checked, το Svelte όχι |
| NumberInput | `clampOnBlur` default true στο Astro, false στο Svelte |
| RadioGroup | required prop στο Svelte, όχι στο ελεγμένο Astro API |
| MultiSelect | Διαφορετικές επιλογές εμφάνισης actions και διαφορετική SSR projection |
| Markup hooks | NumberInput control/input και Checkbox label/root δομές διαφέρουν |
| Initial/default values | Astro εκθέτει χωριστά defaults σε περισσότερα controls, Svelte συχνά δεσμεύει το initial bound value |

**Πρόταση:** πίνακας parity ανά component με props, defaults, events, data-parts, native projection, SSR, keyboard και teardown. Αποκλίσεις επιτρέπονται μόνο όταν είναι σκόπιμες και τεκμηριωμένες.

### G09 — P2: το structural CSS δεν είναι πλήρως απομονωμένο

Το Svelte base.css περιέχει global selectors όπως `[hidden]`, `[data-part='content']` με fixed positioning και `[data-part='root'][data-orientation='vertical']` με touch-action. Αυτά μπορούν να επηρεάσουν άλλα components που χρησιμοποιούν τα ίδια generic data-part names, ιδιαίτερα κατά τη συνύπαρξη δύο βιβλιοθηκών.

**Πηγή:** `packages/ui-svelte/src/lib/base.css:17–51`.

Η επίπτωση σε συγκεκριμένη οθόνη Workspace δεν αναπαράχθηκε στο παρόν audit. Πρόκειται για τεκμηριωμένο integration risk από το εύρος των selectors.

**Πρόταση:** namespaced structural hooks που παραμένουν έγκυρα και μετά το portal. Κοινό styling contract στους δύο adapters, σαφή state attributes και CSS custom properties για τις γενικές διαστάσεις/layers. Τα χρώματα, card/pill variants και το design του Workspace παραμένουν στον consumer.

## 7. Components που λείπουν και πού ανήκουν

| Ανάγκη | Προτεινόμενη αντιμετώπιση |
|---|---|
| Button / IconButton | Υποψήφια ουδέτερα primitives/adapters για button/link, disabled, loading, refs και ARIA. Δεν υπάρχουν αντίστοιχα exports σήμερα. |
| Badge / chips / progress / spinner / skeleton | Αρχικά διατήρηση στο Workspace. Πιθανή ξεχωριστή βιβλιοθήκη presentation primitives, αν είναι στόχος του ooops-ui. |
| Date picker / calendar / date range | Πραγματικό κενό σε σχέση με DateField του Workspace. Το `Input type=date` δεν αντικαθιστά πλήρη custom picker. Ανεξάρτητο έργο με locale/timezone/keyboard συμβόλαιο. |
| Drawer | Γενική modal/non-modal drawer συμπεριφορά μπορεί να προστεθεί αργότερα. Rail offsets, workspace navigation και app persistence μένουν τοπικά. |
| TokenInput / tag picker | Να αξιολογηθεί composition πάνω σε Combobox/MultiSelect· τα tags/domain permissions μένουν στο Workspace. |
| DataTable / selectable/virtualized lists | Μεγάλο ανεξάρτητο scope. Δεν προτείνεται ως προϋπόθεση του πρώτου migration. |
| Toast / command palette / menus ειδικών εργασιών | Προαιρετικά ξεχωριστά primitives αργότερα. Domain actions και συντονισμός εφαρμογής παραμένουν τοπικά. |

Δεν είναι όλα τα παραπάνω «ελαττώματα». Το repo δηλώνει design-neutral behavior library. Χρειάζεται συνειδητή απόφαση scope πριν μεταφερθούν presentation ή application patterns.

Σημαντική ονοματολογική παγίδα: το σημερινό Workspace `ToggleSwitch` είναι επιλογή μεταξύ πολλών τιμών, επομένως ταιριάζει σημασιολογικά σε `SegmentedControl`, όχι στο boolean `Switch`.

## 8. Κενά τεκμηρίωσης και quality gates

### G10 — P2: coverage markers δεν αποδεικνύουν κάθε branch

Το `check-feature-coverage.mjs:20` ελέγχει ότι υπάρχει `[FM-...]` κείμενο στα αρχεία test. Δεν συσχετίζει κάθε branch του matrix με εκτελεσμένη assertion. Ο έλεγχος πέρασε, ενώ τα πρόσθετα probes βρήκαν κενά.

**Πρόταση:** ανεξάρτητα case IDs ανά branch, σύνδεση με αποτελέσματα runner και adapter-specific regressions. Η controller coverage δεν υποκαθιστά binding/SSR/FormData tests.

### G11 — P3: AT πρωτόκολλο υπάρχει, evidence δεν επαληθεύτηκε

Το `docs/assistive-technology-testing.md` ορθά διαχωρίζει automated checks και πραγματικά screen-reader runs. Το checker επαληθεύει το σχήμα του πρωτοκόλλου. Δεν δόθηκε στο audit evidence bundle VoiceOver/NVDA δεμένο στο commit· δεν μπορεί να δηλωθεί AT certification. Η απουσία bundle από το repo δεν αποδεικνύει ότι δεν έχει γίνει εξωτερικά έλεγχος.

### G12 — P3: αρχιτεκτονικές οδηγίες ξεπερασμένες

Το `docs/architecture.md:16` περιγράφει Combobox/MultiSelect ως future primitives, ενώ είναι ήδη υλοποιημένα και εξάγονται. Αντίστοιχη παλιά απαγόρευση scope υπάρχει στο `packages/ui-primitives/AGENTS.md`.

**Πρόταση:** ενημέρωση architecture/AGENTS, API reference για όλα τα exported components, migration recipes και ρητή λίστα reactive/immutable props. Το σημερινό σύντομο README δεν αρκεί για ισοδύναμη αντικατάσταση εφαρμογής.

## 9. Αναθεωρημένη σειρά εργασιών

### Παρτίδα Α — Σταθερότητα πριν από migration

- F01 callbacks και F02 SSR checked.
- F03 disabled form projections, F04 readonly clear, F05 reset.
- F06 reactive configuration και πίνακας reactive props για όλα τα adapters.
- Regression tests σε controllers, Svelte adapters και browser fixtures όπου αφορά πραγματικό input/hydration.

Έξοδος: πράσινα τα νέα regressions, οι υπάρχουσες suites και τα σχετικά browser tests. Η πρώτη παρτίδα αφορά διορθώσεις, όχι προσθήκη πολλών νέων components.

### Παρτίδα Β — Συμβόλαιο controls

- Native attributes/events/refs και accessible naming.
- Field/control association και defaults/reset semantics.
- Namespaced CSS και Astro/Svelte parity.
- Μικρό Workspace bridge με το σημερινό public API των wrappers.

Έξοδος: διατήρηση labels, validation, autosave, focus και υποβολής φόρμας χωρίς αλλαγή domain behavior.

### Παρτίδα Γ — Πρώτα pilots στο Workspace

1. Απλά checkboxes του Settings importer, **αφού διορθωθεί το SSR checked**.
2. Radio groups θέματος και export, **μετά τον έλεγχο naming/reset**.
3. Read-only/disabled πεδία σύγκρισης εκδόσεων.
4. Μία απλή επεξεργάσιμη φόρμα με autosave/validation tests.

Οι προηγούμενες προτάσεις «χαμηλού ρίσκου» αφορούν περιορισμένο blast radius· το παρόν βαθύτερο audit εντόπισε προϋποθέσεις που πρέπει πρώτα να ικανοποιηθούν. Δεν συστήνεται άμεση καθολική αλλαγή των wrappers.

### Παρτίδα Δ — Overlays και navigation

External anchors, portal/focus ownership, Dialog/Modal close lifecycle, Tabs adapter. Μετά ξεχωριστά menu/select pilots, nested-dialog και keyboard/mobile tests. Date picker και DataTable αποτελούν μεταγενέστερα projects.

## 10. Κριτήρια αποδοχής κάθε αντικατάστασης

- Τιμή, callback και dirty/autosave state συμφωνούν μετά από user edit, parent update και reset.
- Ίδιο FormData για checked/unchecked, disabled, required, empty και multiple values.
- Σωστή αρχική κατάσταση σε SSR και καθυστερημένο hydration.
- Ίδια αποτελέσματα validation· κανένα διπλό save ή χαμένη επεξεργασία.
- Keyboard flow, Escape, focus restoration και εξωτερικά labels παραμένουν σωστά.
- Οι portals διατηρούν theme/layer/focus boundaries χωρίς global CSS παρενέργειες.
- Desktop/mobile, dark/light, reduced motion και υποστηριζόμενα browsers ελέγχονται στις πραγματικές οθόνες.
- Packaged exports και consumer dependency versions επιβεβαιώνονται πριν από release.

## 11. Evidence και αναπαραγωγή

Τα στοιχεία βρίσκονται στο `docs/audits/evidence/2026-10-21/`:

- `adapter-probes.test.ts.txt`: ακριβής κώδικας των πρόσθετων tests.
- `adapter-probes.log.txt`: οι 9 αποτυχίες / 1 επιτυχία.
- `ssr-checked-probe.log.txt`: server HTML των Checkbox/Switch με checked=true.
- `primitives-tests.log.txt`, `svelte-tests.log.txt`, `astro-tests.log.txt`: τα 70 υπάρχοντα tests που πέρασαν.
- `svelte-typecheck.log.txt`, `astro-typecheck.log.txt`: αποτελέσματα package checks.

Για επανεκτέλεση των probes, αντιγραφή του `.test.ts.txt` ως `packages/ui-svelte/src/lib/audit-probe.test.ts` και εκτέλεση `pnpm --filter @ooopsstudio/ui-svelte exec vitest run src/lib/audit-probe.test.ts`. Το αρχείο είναι προσωρινό audit fixture και αναμένεται να αποτύχει στο ελεγμένο commit μέχρι να διορθωθούν τα ευρήματα.

Το SSR probe χρησιμοποιεί `compile(source, {generate:'server'})` από `svelte/compiler` και `render(Component, {props:{id:'probe', name:'probe', label:'Probe', checked:true}})` από `svelte/server`. Δεν απαιτεί ή προσομοιώνει browser interaction.

Παραδόθηκαν μόνο το report και τα evidence αρχεία. Οι υλοποιήσεις και οι ενεργές test suites δεν τροποποιήθηκαν.

## 12. Συνέχεια: διορθώσεις των έξι επιβεβαιωμένων προβλημάτων

Η προηγούμενη ενότητα περιγράφει την αρχική παράδοση του audit. Μετά από ξεχωριστή έγκριση υλοποιήθηκαν τοπικά οι παρακάτω διορθώσεις, πριν από οποιαδήποτε μεταφορά στο Workspace:

| Εύρημα | Διορθωμένη συμπεριφορά | Μόνιμη κάλυψη |
| --- | --- | --- |
| F01 — Input/Textarea callbacks | Κάθε edit εκπέμπεται μία φορά, ακόμη και μετά από parent update και επιστροφή σε παλιότερη τιμή. | Svelte unit και rendered browser tests. |
| F02 — Checkbox/Switch SSR | Το server HTML περιλαμβάνει checked defaults. Native αλλαγές πριν από hydration διατηρούνται και το reset επαναφέρει το αρχικό default. | Controller tests, JavaScript-disabled browser context και εσκεμμένα καθυστερημένο hydration. |
| F03 — Disabled projections | Τα κρυφά inputs των Combobox, MultiSelect, SegmentedControl και Slider εξαιρούνται από native FormData όταν είναι disabled. | Svelte FormData tests με disable/enable/disable και Astro/Svelte browser tests. |
| F04 — Readonly clear | Το clear button είναι disabled και ο handler απορρίπτει readonly/disabled clears. | Svelte callback/value test και Astro/Svelte browser tests. |
| F05 — Choice reset | RadioGroup και SegmentedControl επαναφέρουν controller state, native selection, bindings και hidden values μετά το native reset, χωρίς user-change callback. | Controller tests για canceled reset, διαδοχικά resets, αφαιρεμένο default και teardown· adapter και browser tests. |
| F06 — Accordion configuration | Αλλαγές type/collapsible ενημερώνουν τον controller. Μετάβαση σε single διατηρεί το πρώτο ανοικτό panel. | Controller και Svelte tests, μαζί με rendered αλληλεπιδράσεις. |

Τα ενεργά regression tests βρίσκονται στα:

- `packages/ui-primitives/test/migration-regressions.test.ts`
- `packages/ui-svelte/src/lib/migration-regressions.test.ts`
- `tests/e2e/astro/migration-regressions.spec.ts`
- `tests/e2e/svelte/migration-regressions.spec.ts`

Ο συνολικός `pnpm -w validate` ολοκληρώθηκε επιτυχώς: 115 unit tests, lint, typechecks, coverage, package-size/dependency checks, publint, attw και πραγματικά packed-consumer builds. Οι 12 νέες browser εκτελέσεις πέρασαν σε Chromium, Firefox και WebKit, με axe και runtime-error assertions στα σχετικά interactive scenarios. Μετά την τελική αλλαγή του browser fixture επαναλήφθηκαν επιτυχώς lint και SvelteKit typecheck (0 errors, 0 warnings).

Διορθώθηκε επίσης το packed-consumer harness ώστε να χρησιμοποιεί το CLI και την ακριβή εγκατεστημένη έκδοση του consumer toolchain, καθώς και canonical temporary paths στο macOS. Αυτό επιβεβαιώνει το κλειδωμένο toolchain, όχι κάθε μελλοντική έκδοση εντός του peer range.

Πέρασαν επίσης 50 υπάρχοντα Chromium browser tests από τις suites `tests/browser/components.spec.ts`, `tests/e2e/{astro,svelte}/components.spec.ts` και `tests/e2e/{astro,svelte}/behavior-matrix.spec.ts`. Καλύπτουν native form resets, reactive controls, keyboard navigation, nested overlays, focus restoration, cleanup/remount και axe. Δεν εκτελέστηκε ολόκληρο το `validate:release`, τα visual snapshots ή τα stress suites, αφού δεν ζητήθηκε δημοσίευση.

Τα diagnostic bindings του browser fixture χρησιμοποιούν μη form-associated status elements: ένα native `<output>` μέσα σε φόρμα μπορεί στο reset να αντικαταστήσει τους text nodes του και να αλλοιώσει την ίδια τη μέτρηση.

Οι διορθώσεις δεν κλείνουν τα υπόλοιπα κενά του audit και δεν αποτελούν έγκριση καθολικής αντικατάστασης των Workspace wrappers. Δεν έγινε publish ή μεταφορά στο Workspace. Η μεταφορά εξακολουθεί να χρειάζεται τα pilots και τα κριτήρια αποδοχής των ενοτήτων 9–10.


## 13. Συνέχεια: συμβόλαια για consumers και release candidate

Υλοποιήθηκαν οι έξι επόμενες προτεραιότητες πριν από migration:

1. **Disabled MultiSelect:** guards σε chip removal, toggle, clear, select-all και Backspace, μαζί με disabled markup και στους δύο adapters.
2. **Input/Textarea:** typed native attributes και DOM events στο πραγματικό control, συγχώνευση εξωτερικών description IDs, bindable element refs στο Svelte και cleanup refs στο unmount.
3. **Accessibility/Field:** εξωτερικό accessible naming στα choice/value controls· το Svelte Field παρέχει control attributes στο children snippet. Το portable `getFieldControlAttributes` επιτρέπει SSR σύνδεση label/description/error/pending και στο Astro. Το validation lifecycle και το autosave παραμένουν στον consumer.
4. **Structural CSS:** ownership marker `data-ooops-ui`, περιλαμβανομένων portaled/generated elements. Generic `data-part` άλλης βιβλιοθήκης δεν ενεργοποιεί structural styles.
5. **Adapter contracts:** ίδιο NumberInput clampOnBlur default (false), κοινά MultiSelect action-visibility props, recursive menus, ενημέρωση checkbox/radio menu model και ρητός πίνακας reactive/mount-time props. Η αλλαγή του Astro default τεκμηριώνεται στο changelog.
6. **Overlays/navigation:** external anchors, custom portal container, width/offset/z-index options, close veto με συνεπή controlled state, focus targets, busy/async confirmation error handling και cleanup listeners/trigger ARIA. Τα Tabs υποστηρίζουν external panels, badges και navigation buttons.

Ο πλήρης οδηγός API και τα migration recipes βρίσκονται στο `docs/consumer-contracts.md`. Το νέο behavior καλύπτεται από `public-contracts.test.ts` στα primitives και Svelte, καθώς και `tests/e2e/{astro,svelte}/public-contracts.spec.ts`. Τα αρχικά migration regression tests παραμένουν ενεργά.

**Τελική τοπική επαλήθευση:** `pnpm -w validate:release` ολοκληρώθηκε με exit 0. Πέρασαν 125 unit tests, 143 browser εκτελέσεις στις διαμορφωμένες Chromium/Firefox/WebKit suites, 10 visual tests χωρίς αλλαγή baselines και 2 stress tests των 100 mount/unmount κύκλων ανά adapter. Τα 2 επιπλέον stress skips είναι οι σκόπιμα μη εφαρμόσιμες διασταυρώσεις Astro test/Svelte project και αντίστροφα. Πέρασαν lint, typechecks, per-file coverage thresholds, size/dependency checks, publint, attw και packed-consumer builds. Τα primitives κατέγραψαν 99.61% statements και 92.72% branches. Ο έλεγχος SvelteKit είχε 0 errors και 0 warnings.

Ελέγχθηκε επίσης το fixture `/contracts` σε 1280×900 και 393×852, με πραγματική εστίαση μέσω ref και χωρίς page errors. Πρόκειται για fixture της ουδέτερης βιβλιοθήκης, όχι έλεγχο πραγματικής οθόνης Workspace. Οι εκδόσεις του candidate είναι `ui-primitives 0.4.0`, `ui-svelte 0.3.0` και `ui-astro 0.3.0`.

Τα πραγματικά Workspace pilots, η χειροκίνητη δοκιμή με screen reader και τα ανεξάρτητα νέα components της ενότητας 7 παραμένουν επόμενες εργασίες. Το παρόν δεν πιστοποιεί καθολική αντικατάσταση των υφιστάμενων wrappers.


## 14. CI follow-up: dependency audits και σταθερή κάλυψη

Το πρώτο commit `fee543a` πέρασε το τοπικό release gate με το αρχικό toolchain, αλλά το GitHub CI εντόπισε advisories σε development/fixture dependencies και το Release σταμάτησε στο per-file coverage του Dialog στο Linux. Δεν έφτασε στο βήμα publish.

Ενημερώθηκαν Astro σε 7.4.1, Vite σε διορθωμένες εκδόσεις των ήδη χρησιμοποιούμενων majors και Vitest/coverage-v8 σε 4.1.x, μαζί με στοχευμένα transitive overrides. Το release gate εκτελεί πλέον τα ίδια production/development audits πριν από τα υπόλοιπα checks. Το preview του Astro εκκινεί με `--ignore-lock`, ώστε το Playwright να κατέχει foreground process ακόμη και σε περιβάλλον agent.

Η αλλαγή coverage provider του Vitest 4 χρησιμοποιεί AST-based remapping. Προστέθηκαν ουσιαστικά regressions για native/busy dialog close, pending-save teardown, RTL/non-looping/empty menus, επιλογές Select χωρίς native projection ή μετά από απομάκρυνση του listbox και dirty state Date/array/object. Τα τελευταία εντόπισαν και διόρθωσαν εσφαλμένη ισότητα μεταξύ διαφορετικών τύπων τιμής. Τα όρια κάλυψης δεν μειώθηκαν.

### Περιορισμένες development εξαιρέσεις

Το `config/dependency-audit-policy.json` περιέχει δύο ακριβείς, προσωρινές εξαιρέσεις:

- `braces 3.0.3`, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): glob patterns εργαλείων Changesets/Stryker που ορίζονται από το repository. Δεν δέχονται εξωτερικά runtime patterns.
- `sprintf-js 1.0.3`, [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c): YAML/argparse του Changesets με σταθερά developer-controlled format strings.

Κατά τον έλεγχο δεν υπήρχαν δημοσιευμένα patched npm releases για αυτές τις δύο εξαρτήσεις. Παραμένουν πραγματικά upstream advisories, όχι ισχυρισμός μηδενικών ευπαθειών. Δεν αποτελούν εξαρτήσεις του shipped UI runtime.

Η πολιτική επιτρέπει μόνο το συγκεκριμένο GHSA/package/version όταν **όλα** τα findings έχουν `dev=true`. Δεν εφαρμόζεται στο production audit. Νέα advisories, διαφορετικές εκδόσεις, παραγωγικές διαδρομές, μη έγκυρα audit responses ή ελλιπής αιτιολόγηση μπλοκάρουν τον έλεγχο. Η επανεξέταση ορίστηκε έως **21/11/2026** και μετά η εξαίρεση παύει να ισχύει. Τα τέσσερα Node tests στο `scripts/audit-dependencies.test.mjs` ελέγχουν αυτούς τους περιορισμούς και εκτελούνται μέσα στο `validate`.

Ο ενημερωμένος candidate επαληθεύεται με `pnpm -w validate:release`, περιλαμβανομένων audits, policy tests, όλων των unit/browser/visual/stress suites και πραγματικών packed-consumer builds. Το production audit δεν έχει blocking findings· το development audit εμφανίζει ρητά τις δύο παραπάνω εξαιρέσεις.


**Επανεκτέλεση μετά το CI follow-up:** το `pnpm -w validate:release` ολοκληρώθηκε με exit 0: 132 unit tests και 4 policy tests, 143 browser εκτελέσεις, 10 visual checks χωρίς νέα baselines και 2 stress σενάρια των 100 κύκλων. Με Vitest 4 το AST-based coverage κατέγραψε 98.60% statements και 93.36% branches, με επιτυχή τα αμετάβλητα όρια ανά αρχείο. Δεν υπάρχουν peer dependency issues. Περιορίστηκε ο παραλληλισμός των unit suites και αυξήθηκε μόνο το χρονικό περιθώριο του randomized lifecycle test σε 30s· παραμένουν 100 runs με έως 60 commands και όλες οι αρχικές assertions.

Για τη rendered επαλήθευση χρησιμοποιήθηκε το Playwright workflow του repo: Browser plugin/skill δεν υπήρχε στον διαθέσιμο κατάλογο. Το release παραμένει gated από τα audits και ολόκληρο το `validate:release` στο GitHub Actions πριν από τη δημοσίευση.

Το CI/release toolchain ενημερώθηκε σε Node >=22.22.0, την ελάχιστη έκδοση του Astro 7.4. Το τοπικό πλήρες gate είχε εκτελεστεί με Node 22.22.1· το παλιό hardcoded 22.14 του GitHub workflow διορθώθηκε χωρίς αλλαγή στα tests ή στα thresholds.
