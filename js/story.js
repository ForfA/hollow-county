// Hollow County — all narrative text: intro, radio traffic, notes, diary pages, endings, barks.
'use strict';
HC.story = {
  intro: {
    head: 'AUGUST 14, 1993 — LORNE COUNTY, KENTUCKY',
    text:
`Nine days ago something got out of the Meridian Biologics campus on Route 9. By the time anyone said "quarantine" out loud, Lorne County was already lost.

The Army pulled back to the Harrow River and put a fence around the rest of us.

You are Specialist Jordan Hale, combat medic, Kentucky Army National Guard. Your unit was running the wounded out of Cedar Fork when your ambulance rolled on Paper Mill Road. Ruiz, your driver, didn't get up. Not the first time, anyway.

The radio still works. It keeps saying the same thing: the last evacuation leaves the Route 9 bridge at dawn on the 17th. After that, the bridge comes down.

Seventy-two hours. Eleven miles.

Start walking.`,
  },

  ebsCrawl: 'THE FOLLOWING COUNTIES ARE UNDER MANDATORY FEDERAL QUARANTINE: LORNE • HARDESTY • COLTER (NORTH OF ROUTE 60) ••• REMAIN INDOORS ••• DO NOT APPROACH THE SICK OR THE DECEASED ••• DO NOT ATTEMPT TO CROSS THE HARROW RIVER ••• FINAL EVACUATION: ROUTE 9 BRIDGE CHECKPOINT, 0600 AUGUST 17 ••• ALL EVACUEES WILL BE SCREENED ••• THIS IS NOT A TEST •••',

  radio: {
    m1_start: { from: 'EMERGENCY BROADCAST', ebs: true, lines: ['...residents of Lorne County are advised to remain indoors.', 'Do not approach the sick. Do not approach the deceased.', 'Final evacuation departs the Route 9 bridge checkpoint at 0600, August 17th.', 'All evacuees will be screened. This is not a test.'] },
    m1_dispatch: { from: 'DUSTOFF BASE', lines: ['Any Charlie-Two units, this is Dustoff Base.', 'Cedar Fork is lost. Repeat, Cedar Fork is lost.', 'Rally at St. Agnes Memorial. Medevac lifts from the north lot at 0100.', 'Do not bring bite cases. Dustoff out.'] },
    m1_gas: { from: 'UNKNOWN', lines: ['...is anybody out there? This is the Pruitt house on Mill...', '...they\'re in the yard, they\'re in the...', '[static]'] },
    m2_start: { from: 'DUSTOFF 6', lines: ['St. Agnes, Dustoff Six, on approach, north lot.', 'We have eyes on the lot. There\'s... a lot of people down there.', 'They\'re not... they\'re not waving. Pulling up, pulling —', '[static]'] },
    m2_pharmacy: { from: 'EMERGENCY BROADCAST', ebs: true, lines: ['...evacuees will be screened for fever and open wounds.', 'Persons showing symptoms will not be permitted to cross.', 'Remain calm. Remain indoors.'] },
    m2_dock: { from: 'UNKNOWN', lines: ['...anyone reading this, this is Deb at the Riverside Mall.', 'We have food, we have walls. Come in off River Road, loading dock side.', 'Don\'t come if you\'re bit. I mean it. Riverside out.'] },
    m3_start: { from: 'RIVERSIDE (RECORDED)', lines: ['...this is Deb at the Riverside Mall. We have food, we have walls.', 'Come in off River Road. Don\'t come if you\'re bit.', '[the message loops. It has been looping for a long time.]'] },
    m3_alarm: { from: 'EMERGENCY BROADCAST', ebs: true, lines: ['ATTENTION. FIRE ALARM ACTIVATED — RIVERSIDE MALL, ZONE 2.', 'Every dead thing between here and the river just heard that.', '(That last part was you, Jordan. Move.)'] },
    m3_army: { from: 'CHECKPOINT ROUTE 9', lines: ['All stations, Checkpoint Nine.', 'Perimeter compromised at the south gate. Falling back across the river.', 'Last bird lifts from the tower LZ at 0600. Whoever\'s left, be on it.'] },
    m4_start: { from: 'DUSTOFF 6', lines: ['Any station, Dustoff Six. We will make one pass at the tower LZ.', 'Pop smoke and call us on three-four-niner-zero.', 'No call, no pickup. Dustoff out.'] },
    m4_tower: { from: 'DUSTOFF 6', lines: ['Tower LZ, Dustoff Six. Copy your call.', 'Inbound, ninety seconds. Keep that pad clear.', 'And whoever you are... look healthy.'] },
    m4_heli: { from: 'DUSTOFF 6', lines: ['Wheels down! Get on, get on, GET ON!'] },
  },

  notes: {
    m1: [
      { style: 'clip', title: 'RUN SHEET — 14 AUG 93', body: 'Pt 1: M, ~40. Bite wound L forearm. Temp 104.1. Combative.\nPt 2: F, 16. Bite wound R calf. Unresponsive 1510. Pronounced 1522.\nPt 2: Resp. 1531 (???)\n\n(in the margin, in Ruiz\'s handwriting)\nJordan — I am not driving anybody else who is bit. I don\'t care what the Lt says.', sig: '' },
      { style: 'paper', title: 'Dale —', body: 'Took the kids to Mom\'s in Colter. Roads out are closed but Pastor Gene says the church bus is going through.\n\nYour shotgun is in the GARAGE. The garage key is on the hook in our bedroom, where it always is.\n\nDon\'t be stubborn. Come find us.', sig: '— Lynn' },
      { style: 'paper', title: 'Carl —', body: 'Back gate key is on the office desk. If the Guard comes through, give them the key and whatever gas they want.\n\nThe underpass is the only way out of Cedar Fork that isn\'t full of them. The cops blocked the road at the station and then the cops stopped being cops.', sig: '— Ray' },
      { style: 'paper', title: 'rainy day', body: 'If you found this you found my stash. Take it.\n\nAin\'t no rainy day coming worse than this one.', sig: '— D.' },
    ],
    m2: [
      { style: 'clip', title: 'TRIAGE — 8/13 2300', body: 'BITE CASES → WARD B ONLY.\nDo NOT sedate. Sedation accelerates onset. (Dr. Marsh)\nRestraints on all Ward B beds.\nMorgue at capacity — hold deceased in the chapel.\n\n(someone has crossed that out and written underneath)\nDO NOT HOLD THEM IN THE CHAPEL', sig: '' },
      { style: 'type', title: 'E. MARSH, MD — PERSONAL NOTES', body: 'The Meridian people arrived at noon with a crate of MX-7 and a man in a suit who would not give his name.\n\nMX-7 is an antiviral they were trialing against the very thing they made. It does not cure. It holds the fever back. I watched it work on a nurse. I watched it stop working on a nurse.\n\nForty doses are locked in the pharmacy. Nurse Okafor has the pharmacy key. Ward B.', sig: '— E.M.' },
      { style: 'clip', title: 'SECURITY LOG', body: '0040 — Helo on approach, north lot.\n0046 — Helo went down in the north lot. Nobody got out.\n0050 — We\'re leaving through the loading dock.\n\nDock keycard is in the security office. Door code is taped under the desk, not that it matters now.\n\nDon\'t come after us.', sig: '— Pete, Security' },
      { style: 'paper', title: '(on a morgue drawer)', body: 'Tags 14 through 22 moved tonight.\n\nI didn\'t imagine it. I heard them. I\'m locking the drawers and I\'m not coming back down here.', sig: '' },
      { style: 'paper', title: 'For whoever finds this', body: 'I stashed what I could behind the linen closet panel on Ward A. Bandages, pills, a couple doses.\n\nIf you\'re a nurse, you know which panel. If you\'re not, look for the one that doesn\'t sit flush.', sig: '— R.O.' },
    ],
    m3: [
      { style: 'paper', title: 'RIVERSIDE RULES', body: '1. Nobody goes out alone.\n2. No noise after dark.\n3. NOBODY touches the alarm panel in maintenance.\n4. If you\'re bit, you tell Deb. No hard feelings.\n\nWe mean it.', sig: '' },
      { style: 'paper', title: 'Deb — day 6', body: 'Twelve of us left. Frank says the sporting goods shutter runs off the maintenance breakers. Kill the grid lock and it opens.\n\nIt also trips the fire alarm. Every dead thing from here to the river would hear it.\n\nWe voted no. Frank didn\'t like that.', sig: '' },
      { style: 'clip', title: 'SECURITY — KEY CONTROL', body: 'BLUE card — maintenance corridor.\nYELLOW card — loading dock.\n\nDO NOT GIVE EITHER TO FRANK.', sig: '' },
      { style: 'paper', title: '(crayon)', body: 'this is me and Biscuit.\nBiscuit is a good dog. he is at home.\nmom says we cant go home.\n\n(a drawing of a dog, very carefully coloured in)', sig: '' },
      { style: 'paper', title: 'They voted wrong.', body: 'I pulled the breakers. I got the rifle.\n\nI didn\'t get far.', sig: '— F.' },
    ],
    m4: [
      { style: 'type', title: 'ROUTE 9 CROSSING — STANDING ORDERS', body: 'All civilians will be screened at Tent 3.\nTemperature above 100.4F: turned back.\nVisible wounds: turned back.\nRefusal to comply: see ROE, Annex C.\n\n(handwritten beneath)\nGod forgive us.', sig: '' },
      { style: 'type', title: 'MEDICAL OFFICER — SCREENING SUMMARY', body: 'Evacuees sampled today: 214.\nPositive for agent: 214.\n\nEvery single one. It is in the air, in the water, in us. It sleeps until something wakes it — a bite, a fever, a bad day.\n\nCommand\'s answer: screen for SYMPTOMS, not for the virus. Anyone who looks sick stays. Anyone who looks fine goes.\n\nWe are sorting the dead from the not-yet.', sig: '— CPT A. Voss, MC' },
      { style: 'clip', title: 'EOD — BRIDGE CHARGES', body: 'Charges set on supports 2 and 3. Firing panel is in the radio tower.\n\nIf you\'re reading this and I\'m not there: blow it at 0600 when the last bird is up. Do not wait for me.\n\nThe command post keycard is on me. If I\'m not me anymore, take it anyway.', sig: '— SSG R. Tully, EOD' },
      { style: 'clip', title: 'COMMO — FREQS', body: 'DUSTOFF 6 ....... 34.90\nCHECKPOINT 9 ... 41.25\n\nDustoff will make ONE pass at the tower LZ.\nNo call, no pickup.\n\nTower door is on the command post keycard (yellow).', sig: '' },
    ],
  },

  diary: [
    { head: 'DAY 1 — 23:00', text: 'I made it out of Cedar Fork.\n\nI keep wiping my hands on my pants. The blood is dry. It\'s just a habit now.\n\nThe radio said St. Agnes, 0100. I\'ve been on that helipad a dozen times with somebody strapped to a litter.\n\nTonight I\'m hoping somebody straps in me.' },
    { head: 'DAY 2 — 13:40', text: 'The helicopter came. It just didn\'t land.\n\nMarsh said MX-7 holds the fever back. I don\'t know if I have a fever to hold back. I don\'t know if anybody doesn\'t.\n\nRiver Road runs past the Riverside Mall. There\'s a woman named Deb on the radio who says they have walls.\n\nRain coming in.' },
    { head: 'DAY 3 — 04:30', text: 'Deb\'s message is still looping. Nobody\'s been there to turn it off for days.\n\nThe alarm is still ringing in my ears.\n\nFive miles to the bridge. An hour and a half to dawn. They\'re screening for fever.\n\nI had better not have one.' },
  ],

  ending: {
    good: {
      big: 'WHEELS UP',
      text: 'The medic at the door looks at your eyes, your hands, the bite-free skin of your forearms, and waves you aboard.\n\nBehind you, the Route 9 bridge folds into the Harrow River like it was made of paper.\n\nSomewhere over Colter County, the medic draws a vial of your blood. They don\'t tell you the result.\n\nThey don\'t have to. Nobody from Lorne County is clean.\n\nBut you look fine. And today, that is the same thing as being alive.',
      tag: 'This is how you survived.',
    },
    bad: {
      big: 'SCREENED',
      text: 'The medic at the door looks at your eyes. At the sweat. At the way your hands won\'t stop shaking.\n\n"I\'m sorry," they say, and they mean it, and the rifle comes up anyway.\n\nThe helicopter lifts off without you. Behind it, the Route 9 bridge folds into the Harrow River like it was made of paper.\n\nThe fever does the rest.',
      tag: 'This is how you died.',
    },
  },

  death: {
    zombie: ['You were dragged down in {place}.', 'You were torn apart in {place}.', 'They caught you in {place}.'],
    infection: ['The fever took you in {place}.'],
    fire: ['You burned to death in {place}.'],
  },

  barks: {
    start_m1: ['Ruiz... I\'m sorry.'],
    start_m2: ['That\'s the medevac. That WAS the medevac.'],
    start_m3: ['Deb? ...Anybody?'],
    start_m4: ['Almost there. Almost.'],
    firstZed: ['Don\'t... don\'t come any closer.', 'Oh god. Oh god.', 'Stay back!'],
    lowAmmo: ['Running low.', 'Make them count.', 'Need ammo.'],
    noAmmo: ['Empty!', 'Out of ammo!'],
    bitten: ['It bit me. IT BIT ME.', 'No no no no no...', 'That\'s a bite. That\'s a bite.'],
    sick1: ['I don\'t feel so good.', 'Stomach\'s turning.'],
    sick2: ['I\'m burning up.', 'Hands won\'t stop shaking.'],
    sick3: ['Need... the MX-7...', 'Everything\'s so loud.'],
    cured: ['Please work. Please work.', 'Come on, come on...'],
    heal: ['That\'ll hold.', 'Better.', 'Okay. Okay.'],
    bleed: ['I\'m bleeding. Need a bandage.', 'That\'s a lot of blood.'],
    kill: ['Stay down.', 'Sorry. Sorry.', 'Rest.'],
    key: ['Keys.', 'This should open something.'],
    locked: ['Locked. I need the {key}.'],
    barricade: ['Boarded up. I could break it down.'],
    secret: ['Somebody\'s stash. Thank you, whoever you were.'],
    panic: ['Too many. Too many!', 'Breathe. Breathe.'],
    tired: ['Can\'t... keep running.'],
    weapon: ['That\'ll do.', 'Oh, hell yes.'],
  },
};
