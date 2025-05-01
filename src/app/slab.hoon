/+  default-agent
|%
+$  card       card:agent:gall
+$  sign-gall  sign:agent:gall
+$  state-now  [%0 ~]
--
^-  agent:gall
=|  state-now
=*  state  -
=<  |_  bol=bowl:gall
    +*  tis  .
        def  ~(. (default-agent tis |) bol)
        cor  ~(. +> [bol ~])
    ++  on-init   =^(caz state abet:init:cor [caz tis])
    ++  on-save   !>(state)
    ++  on-load   |=(v=vase =^(caz state abet:(load:cor v) [caz tis]))
    ++  on-poke   |=([m=mark v=vase] =^(caz state abet:(poke:cor m v) [caz tis]))
    ++  on-watch  |=(p=path =^(caz state abet:(watch:cor p) [caz tis]))
    ++  on-peek   peek:cor
    ++  on-leave  on-leave:def
    ++  on-fail   on-fail:def
    ++  on-agent  |=([w=wire s=sign-gall] =^(caz state abet:(agent:cor w s) [caz tis]))
    ++  on-arvo   |=([w=wire s=sign-arvo] =^(caz state abet:(arvo:cor w s) [caz tis]))
    --
|_  [bol=bowl:gall caz=(list card)]
::
++  abet  [(flop caz) state]
++  cor   .
++  emit  |=(c=card cor(caz [c caz]))
++  emil  |=(c=(list card) cor(caz (welp (flop c) caz)))
::
++  init
  ^+  cor
  cor
::
++  load
  |=  vas=vase
  ^+  cor
  |^  =+  !<(sat=state-any vas)
      =-  =.(state.cor nat open)
      |-  ^-  nat=state-now
      ?-  -.sat
        %0  sat
      ==
  +$  state-any  $%(state-now)
  +$  state-0    state-now
  --
::
++  poke
  |=  [mar=mark vas=vase]
  ^+  cor
  ::  ?+    mar  ~|(bad-poke+mar !!)
  ::      %noun
  ::    cor
  ::  ==
  cor
::
++  watch
  |=  pat=(pole knot)
  ^+  cor
  ::  ?+    pat  ~|(bad-watch+pat !!)
  ::      [%test ~]
  ::    cor
  ::  ==
  cor
::
++  peek
  |=  pat=(pole knot)
  ^-  (unit (unit cage))
  ::  ?+    pat  [~ ~]
  ::      [%test ~]
  ::    ``atom+!>(~)
  ::  ==
  [~ ~]
::
++  agent
  |=  [pat=(pole knot) syn=sign-gall]
  ^+  cor
  ::  ?+    pat  cor
  ::      [%test ~]
  ::    cor
  ::  ==
  cor
::
++  arvo
  |=  [pat=(pole knot) syn=sign-arvo]
  ^+  cor
  ::  ?+    pat  cor
  ::      [%test ~]
  ::    ?+    syn  cor
  ::        [%behn %wake *]
  ::      cor
  ::    ==
  ::  ==
  cor
::
++  open
  ^+  cor
  cor
--
