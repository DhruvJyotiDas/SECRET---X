Set WshShell = CreateObject("WScript.Shell")
projectPath = "C:\Users\dhruv\OneDrive\Desktop\x\meet-clock vanilla"
cmd = "cmd /c cd /d """ & projectPath & """ && npm run dev"
WshShell.Run cmd, 0, False
Set WshShell = Nothing
