# UX Core — 105 cognitive biases index + UX cheat-sheet

Source: keepsimple.io UX Core (https://keepsimple.io/uxcore). The **index**
(Part B) is facts (names + links). The **cheat-sheet** (Part A) is this skill's
own glosses mapping UX problems to biases — not keepsimple's text. Fetch a
bias's keepsimple page (`https://keepsimple.io/uxcore/<slug>`) for real usage
examples and the precise mechanism.

Index API (names/slugs only, no descriptions): `GET https://api.keepsimple.io/uxcore/?lang=en` (also `lang=ru`).

---

## Part A — UX problem → bias cheat-sheet

One load-bearing bias per decision. Glosses below are this skill's own.

### Onboarding & first run
- **IKEA effect (#84)** — people value what they helped build/assemble. Let users
  do a small setup step early; raises perceived value and retention.
- **Generation effect (#82)** — self-generated content is remembered better than
  read content. Have the user create/choose rather than read defaults.
- **Peak-end rule (#101)** — experience is judged by its most intense moment and
  its end. Make onboarding's final step a quick win; end on a success.
- **Curse of knowledge (#63)** — experts forget what it's like to be a beginner.
  Onboarding copy must be written for the novice, not the author.

### Memory & recall
- **Magical Number 7±2 (#61)** — working memory holds ~7 chunks. Don't ask users
  to compare 10 options at once; chunk or progressive-disclose.
- **Serial-position effect (#105) / Primacy (#104) / Recency (implicit)** —
  people remember the start and end of a list, not the middle. Put important
  items first or last; bury trivial settings in the middle.
- **Cue-dependent forgetting (#6)** — memory retrieval needs the right cue.
  Reinstating the context where a user learned something helps them recall it.
- **Picture superiority effect (#14) / Von Restorff (#15)** — images beat text
  for recall; the visually distinct item in a set is remembered. Use one
  distinctive element to anchor.

### Attention & scanning
- **Von Restorff effect (#15)** — the odd-one-out grabs attention. Make the
  primary CTA visually distinct from siblings.
- **Banner blindness ≈ Attentional bias (#2) / Selective perception (#28)** —
  users ignore things that look like ads. Don't style important content like a
  banner.
- **Hick's law (not in the 105; related to Magical Number 7±2)** — more choices
  → slower decisions. Reduce options per screen.
- **Negativity bias (#17)** — negative info weighs heavier than positive. Errors
  and warnings need less prominence than praise; one bug feels bigger than three
  compliments.

### Conversion & pricing
- **Anchoring (#18)** — the first number frames all later judgments. Show a
  higher-priced tier or original price first.
- **Decoy effect (#92)** — a third, clearly-worse option pushes users to the
  option you want to sell.
- **Framing (#22)** — "90% fat-free" vs "10% fat". Same fact, different action.
  Frame benefits, not avoided costs, unless warning honestly.
- **Loss aversion (#83)** — losses feel ~2× as bad as equivalent gains feel good.
  "Don't lose your work" > "save your work" for genuine warnings.
- **Weber-Fechner Law (#24)** — perceived change scales with relative, not
  absolute, difference. A 10→11 price jump feels smaller than 1→2; large
  numbers need large deltas to feel different.
- **Endowment effect (#88)** — people overvalue what they already have. Trials
  that let users "own" the product raise willingness to pay.
- **Mental accounting (#57)** — money is categorized by source/purpose. Bundling
  or "credit" framing changes perceived cost.
- **Hyperbolic discounting (#79)** — now beats later, disproportionately. Small
  immediate reward > larger delayed one; free shipping now > discount later.

### Trust & social proof
- **Social proof / Bandwagon (#50)** — people follow the crowd. Real counts,
  testimonials, ratings. Fake scarcity/counts = dark pattern.
- **Authority bias (#48)** — authority markers raise credibility. Use real
  credentials, not invented ones.
- **Halo effect (#54)** — one positive trait colors the whole judgment. Polish
  in one area (typography) raises trust in the rest.
- **Mere-exposure effect (#4) / Illusory truth (#3)** — repetition breeds
  familiarity and belief. Consistent, repeated messaging helps recall; repeating
  false claims to make them believed = manipulation.

### Effort, friction & commitment
- **Status quo / System justification (#90) / Reactance (#91)** — people stick
  with defaults and resist being forced. Make the good path the default; avoid
  forcing — forced changes trigger reactance.
- **Escalation of commitment (#81)** — sunk costs push people to continue. Don't
  trap users in flows they can't cleanly exit.
- **Unit bias (#85)** — people finish the "unit" given. Default portion/step size
  shapes how much users consume/do.

### Self-perception & overconfidence (mostly for *your* decisions, not the user's)
- **Dunning-Kruger (#74) / Illusory superiority (#77) / Overconfidence (#69)** —
  you overestimate your design's clarity. Test with real novices; don't trust
  your own scan.
- **Bias blind spot (#33)** — "I'm not biased". You are. Apply the cheat-sheet to
  your own rationale, not just the user's behavior.
- **Planning fallacy (#67)** — you'll underestimate time/effort. Pad onboarding
  estimates; don't promise "2-minute setup" if it's 10.

### Empty / loading / error states
- **Empathy gap (#9)** — calm designers underestimate stressed users. Design
  error states for the user who's frustrated, not for you.
- **Omission bias (#10)** — doing nothing feels safer than acting, even when
  acting is better. Don't hide destructive-but-correct actions behind inaction.
- **Information bias (#94)** — seeking more info even when it won't change the
  decision. Don't block a flow on a non-loadbearing field.

### Copy & comprehension
- **Processing difficulty effect (#87)** — appropriately hard-to-read text can
  aid memory, but friction in instructions hurts task completion. Match
  difficulty to goal: recall vs. do-it-now.
- **Bizarreness (#12) / Humor (#13)** — unusual or funny content is remembered.
  Use sparingly — novelty that's irrelevant distracts.
- **Self-reference effect (#16)** — info tied to oneself is remembered better.
  "Your projects" > "projects".

---

## Part B — full index (105)

Each row: `#number — Title` → keepsimple page. Fetch the page for usage/examples.

1. Availability heuristics — https://keepsimple.io/uxcore/1-availability-heuristics
2. Attentional bias — https://keepsimple.io/uxcore/2-attentional-bias
3. Illusory truth effect — https://keepsimple.io/uxcore/3-illusory-truth-effect
4. Mere-exposure effect — https://keepsimple.io/uxcore/4-mere-exposure-effect
5. Context effect — https://keepsimple.io/uxcore/5-context-effect
6. Cue-dependent forgetting — https://keepsimple.io/uxcore/6-cue-dependent-forgetting
7. Mood-congruent memory bias — https://keepsimple.io/uxcore/7-mood-congruent-memory-bias
8. Frequency illusion — https://keepsimple.io/uxcore/8-frequency-illusion
9. Empathy gap — https://keepsimple.io/uxcore/9-empathy-gap
10. Omission bias — https://keepsimple.io/uxcore/10-omission-bias
11. Base rate fallacy — https://keepsimple.io/uxcore/11-base-rate-fallacy
12. Bizarreness effect — https://keepsimple.io/uxcore/12-bizarreness-effect
13. Humor effect — https://keepsimple.io/uxcore/13-humor-effect
14. Picture superiority effect — https://keepsimple.io/uxcore/14-picture-superiority-effect
15. Von Restorff effect — https://keepsimple.io/uxcore/15-von-restorff-effect
16. Self-reference effect — https://keepsimple.io/uxcore/16-self-reference-effect
17. Negativity bias — https://keepsimple.io/uxcore/17-negativity-bias
18. Anchoring effect — https://keepsimple.io/uxcore/18-anchoring-effect
19. Conservatism (belief revision) — https://keepsimple.io/uxcore/19-conservatism-belief-revision
20. Contrast effect — https://keepsimple.io/uxcore/20-contrast-effect
21. Distinction bias — https://keepsimple.io/uxcore/21-distinction-bias
22. Framing effect — https://keepsimple.io/uxcore/22-framing-effect
23. Money illusion — https://keepsimple.io/uxcore/23-money-illusion
24. Weber-Fechner Law — https://keepsimple.io/uxcore/24-weber-fechner-law
25. Confirmation bias — https://keepsimple.io/uxcore/25-confirmation-bias
26. Congruence bias — https://keepsimple.io/uxcore/26-congruence-bias
27. Post-purchase rationalization — https://keepsimple.io/uxcore/27-post-purchase-rationalization
28. Selective perception — https://keepsimple.io/uxcore/28-selective-perception
29. Observer-expectancy effect — https://keepsimple.io/uxcore/29-observer-expectancy-effect
30. Ostrich effect — https://keepsimple.io/uxcore/30-ostrich-effect
31. Subjective validation — https://keepsimple.io/uxcore/31-subjective-validation
32. Continued influence effect — https://keepsimple.io/uxcore/32-continued-influence-effect
33. Bias blind spot — https://keepsimple.io/uxcore/33-bias-blind-spot
34. Clustering illusion — https://keepsimple.io/uxcore/34-clustering-illusion
35. Insensitivity to sample size — https://keepsimple.io/uxcore/35-insensitivity-to-sample-size
36. Neglect of probability — https://keepsimple.io/uxcore/36-neglect-of-probability
37. Anecdotal evidence — https://keepsimple.io/uxcore/37-anecdotal-evidence
38. Illusion of validity — https://keepsimple.io/uxcore/38-illusion-of-validity
39. Recency illusion — https://keepsimple.io/uxcore/39-recency-illusion
40. Gambler's fallacy — https://keepsimple.io/uxcore/40-gamblers-fallacy
41. Hot hand fallacy — https://keepsimple.io/uxcore/41-hot-hand-fallacy
42. Illusory correlation — https://keepsimple.io/uxcore/42-illusory-correlation
43. Group attribution error — https://keepsimple.io/uxcore/43-group-attribution-error
44. Fundamental attribution error — https://keepsimple.io/uxcore/44-fundamental-attribution-error
45. Stereotype — https://keepsimple.io/uxcore/45-stereotype
46. Functional fixedness — https://keepsimple.io/uxcore/46-functional-fixedness
47. Just-world fallacy — https://keepsimple.io/uxcore/47-just-world-fallacy
48. Authority bias — https://keepsimple.io/uxcore/48-authority-bias
49. Automation bias — https://keepsimple.io/uxcore/49-automation-bias
50. Bandwagon effect — https://keepsimple.io/uxcore/50-bandwagon-effect
51. Placebo — https://keepsimple.io/uxcore/51-placebo
52. Out-group homogeneity — https://keepsimple.io/uxcore/52-out-group-homogeneity
53. In-group favoritism — https://keepsimple.io/uxcore/53-in-group-favoritism
54. Halo effect — https://keepsimple.io/uxcore/54-halo-effect
55. Positivity effect — https://keepsimple.io/uxcore/55-positivity-effect
56. Not invented here — https://keepsimple.io/uxcore/56-not-invented-here
57. Mental accounting — https://keepsimple.io/uxcore/57-mental-accounting
58. Normality bias — https://keepsimple.io/uxcore/58-normality-bias
59. Survival bias — https://keepsimple.io/uxcore/59-survival-bias
60. Subadditivity effect — https://keepsimple.io/uxcore/60-subadditivity-effect
61. The Magical Number 7±2 — https://keepsimple.io/uxcore/61-the-magical-number-72
62. Illusion of transparency — https://keepsimple.io/uxcore/62-illusion-of-transparency
63. Curse of knowledge — https://keepsimple.io/uxcore/63-curse-of-knowledge
64. Spotlight effect — https://keepsimple.io/uxcore/64-spotlight-effect
65. Illusion of asymmetric insight — https://keepsimple.io/uxcore/65-illusion-of-asymmetric-insight
66. Hindsight bias — https://keepsimple.io/uxcore/66-hindsight-bias
67. Planning fallacy — https://keepsimple.io/uxcore/67-planning-fallacy
68. Pro-innovation bias — https://keepsimple.io/uxcore/68-pro-innovation-bias
69. Overconfidence effect — https://keepsimple.io/uxcore/69-overconfidence-effect
70. Social desirability bias — https://keepsimple.io/uxcore/70-social-desirability-bias
71. Third-person effect — https://keepsimple.io/uxcore/71-third-person-effect
72. Consensus bias — https://keepsimple.io/uxcore/72-consensus-bias
73. Hard-easy effect — https://keepsimple.io/uxcore/73-hard-easy-effect
74. Dunning-Kruger effect — https://keepsimple.io/uxcore/74-dunning-kruger-effect
75. Barnum effect — https://keepsimple.io/uxcore/75-barnum-effect
76. Illusion of control — https://keepsimple.io/uxcore/76-illusion-of-control
77. Illusory superiority — https://keepsimple.io/uxcore/77-illusory-superiority
78. Risk compensation — https://keepsimple.io/uxcore/78-risk-compensation
79. Hyperbolic discounting — https://keepsimple.io/uxcore/79-hyperbolic-discounting
80. Appeal to novelty — https://keepsimple.io/uxcore/80-appeal-to-novelty
81. Escalation of commitment — https://keepsimple.io/uxcore/81-escalation-of-commitment
82. Generation effect — https://keepsimple.io/uxcore/82-generation-effect
83. Loss aversion — https://keepsimple.io/uxcore/83-loss-aversion
84. IKEA effect — https://keepsimple.io/uxcore/84-ikea-effect
85. Unit bias — https://keepsimple.io/uxcore/85-unit-bias
86. Zero-risk bias — https://keepsimple.io/uxcore/86-zero-risk-bias
87. Processing difficulty effect — https://keepsimple.io/uxcore/87-processing-difficulty-effect
88. Endowment effect — https://keepsimple.io/uxcore/88-endowment-effect
89. Backfire effect — https://keepsimple.io/uxcore/89-backfire-effect
90. System justification — https://keepsimple.io/uxcore/90-system-justification
91. Reactance — https://keepsimple.io/uxcore/91-reactance
92. Decoy effect — https://keepsimple.io/uxcore/92-decoy-effect
93. Ambiguity effect — https://keepsimple.io/uxcore/93-ambiguity-effect
94. Information bias — https://keepsimple.io/uxcore/94-information-bias
95. Law of triviality — https://keepsimple.io/uxcore/95-law-of-triviality
96. Conjunction fallacy — https://keepsimple.io/uxcore/96-conjunction-fallacy
97. Less-is-better effect — https://keepsimple.io/uxcore/97-less-is-better-effect
98. Implicit stereotypes — https://keepsimple.io/uxcore/98-implicit-stereotypes
99. Prejudice — https://keepsimple.io/uxcore/99-prejudice
100. Fading affect bias — https://keepsimple.io/uxcore/100-fading-affect-bias
101. Peak-end rule — https://keepsimple.io/uxcore/101-peak-end-rule
102. Serial recall — https://keepsimple.io/uxcore/102-serial-recall
103. List-length effect — https://keepsimple.io/uxcore/103-list-length-effect
104. Primacy effect — https://keepsimple.io/uxcore/104-primacy-effect
105. Serial-position effect — https://keepsimple.io/uxcore/105-serial-position-effect