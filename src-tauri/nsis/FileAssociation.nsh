; FileAssociation.nsh - File association macros for NSIS
; Based on NSIS FileAssoc.nsh

!ifndef FILEASSOCIATION_NSH
!define FILEASSOCIATION_NSH

!include "LogicLib.nsh"

!macro RegisterFileAssociation EXT PROGID DESC ICON CMD
  ; Register extension
  WriteRegStr SHCTX "Software\Classes\.${EXT}" "" "${PROGID}"
  
  ; Register ProgId
  WriteRegStr SHCTX "Software\Classes\${PROGID}" "" "${DESC}"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\DefaultIcon" "" "${ICON}"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\shell\open\command" "" '${CMD}'
  
  ; Notify shell of changes
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro UnregisterFileAssociation EXT PROGID
  ; Remove extension association if it's ours
  ReadRegStr $0 SHCTX "Software\Classes\.${EXT}" ""
  ${If} $0 == "${PROGID}"
    DeleteRegKey SHCTX "Software\Classes\.${EXT}"
  ${EndIf}
  
  ; Remove ProgId
  DeleteRegKey SHCTX "Software\Classes\${PROGID}"
  
  ; Notify shell of changes
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!endif
