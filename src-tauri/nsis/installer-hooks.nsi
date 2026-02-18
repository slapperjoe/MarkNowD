; MarkNowD NSIS Installer Hooks
; Registers .md and .markdown file associations during installation

!include "LogicLib.nsh"

!macro CUSTOM_INSTALL_COMPLETED
  ; Register .md file association (Default Open)
  WriteRegStr SHCTX "Software\Classes\.md" "" "MarkNowD.md"
  WriteRegStr SHCTX "Software\Classes\MarkNowD.md" "" "Markdown Document"
  WriteRegStr SHCTX "Software\Classes\MarkNowD.md\DefaultIcon" "" "$INSTDIR\MarkNowD.exe,0"
  WriteRegStr SHCTX "Software\Classes\MarkNowD.md\shell\open\command" "" '"$INSTDIR\MarkNowD.exe" "%1"'

  ; Register .md Context Menu (Right-click -> Open in MarkNowD)
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.md\shell\MarkNowD" "" "Open in MarkNowD"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.md\shell\MarkNowD" "Icon" "$INSTDIR\MarkNowD.exe,0"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.md\shell\MarkNowD\command" "" '"$INSTDIR\MarkNowD.exe" "%1"'
  
  ; Register .markdown file association (Default Open)
  WriteRegStr SHCTX "Software\Classes\.markdown" "" "MarkNowD.markdown"
  WriteRegStr SHCTX "Software\Classes\MarkNowD.markdown" "" "Markdown Document"
  WriteRegStr SHCTX "Software\Classes\MarkNowD.markdown\DefaultIcon" "" "$INSTDIR\MarkNowD.exe,0"
  WriteRegStr SHCTX "Software\Classes\MarkNowD.markdown\shell\open\command" "" '"$INSTDIR\MarkNowD.exe" "%1"'

  ; Register .markdown Context Menu (Right-click -> Open in MarkNowD)
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.markdown\shell\MarkNowD" "" "Open in MarkNowD"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.markdown\shell\MarkNowD" "Icon" "$INSTDIR\MarkNowD.exe,0"
  WriteRegStr SHCTX "Software\Classes\SystemFileAssociations\.markdown\shell\MarkNowD\command" "" '"$INSTDIR\MarkNowD.exe" "%1"'
  
  ; Notify shell of changes
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro CUSTOM_UNINSTALL_COMPLETED
  ; Unregister .md file association
  ReadRegStr $0 SHCTX "Software\Classes\.md" ""
  ${If} $0 == "MarkNowD.md"
    DeleteRegKey SHCTX "Software\Classes\.md"
  ${EndIf}
  DeleteRegKey SHCTX "Software\Classes\MarkNowD.md"

  ; Unregister .md Context Menu
  DeleteRegKey SHCTX "Software\Classes\SystemFileAssociations\.md\shell\MarkNowD"
  
  ; Unregister .markdown file association
  ReadRegStr $0 SHCTX "Software\Classes\.markdown" ""
  ${If} $0 == "MarkNowD.markdown"
    DeleteRegKey SHCTX "Software\Classes\.markdown"
  ${EndIf}
  DeleteRegKey SHCTX "Software\Classes\MarkNowD.markdown"

  ; Unregister .markdown Context Menu
  DeleteRegKey SHCTX "Software\Classes\SystemFileAssociations\.markdown\shell\MarkNowD"
  
  ; Notify shell of changes
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
