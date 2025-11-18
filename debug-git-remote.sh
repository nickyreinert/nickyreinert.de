#!/usr/bin/env bash

LOGFILE="./debug-git-remote.log"
: > "$LOGFILE"

# Neues: einfacher Timeout-Wrapper, der stdout/stderr ins Log schreibt
run_with_timeout() {
  local timeout="${1:-60}"; shift
  local outfile="${LOGFILE}"
  echo ">>> running (timeout=${timeout}s): $*" | tee -a "$outfile"
  # Start command in subshell, redirect output to logfile
  ( "$@" ) >>"$outfile" 2>&1 &
  local pid=$!
  local elapsed=0
  while kill -0 "$pid" 2>/dev/null; do
    if [ "$elapsed" -ge "$timeout" ]; then
      echo ">>> timeout reached (${timeout}s), terminating pid $pid" | tee -a "$outfile"
      kill -TERM "$pid" 2>/dev/null || true
      sleep 2
      kill -KILL "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return 124
    fi
    sleep 1
    elapsed=$((elapsed+1))
  done
  wait "$pid"
  return $?
}

echo "1) Remote-URL:" | tee -a "$LOGFILE"
git remote -v 2>&1 | tee -a "$LOGFILE" || true
echo | tee -a "$LOGFILE"

echo "2) Konfiguration (global):" | tee -a "$LOGFILE"
git config --global -l 2>&1 | tee -a "$LOGFILE" || true
echo | tee -a "$LOGFILE"

echo "3) Git-Version:" | tee -a "$LOGFILE"
git --version 2>&1 | tee -a "$LOGFILE" || true
echo | tee -a "$LOGFILE"

echo "4) SSH-Agent (läuft er?):" | tee -a "$LOGFILE"
eval "$(ssh-agent -s)" 2>&1 | tee -a "$LOGFILE"
ssh-add -l 2>&1 | tee -a "$LOGFILE" || true
echo | tee -a "$LOGFILE"

echo "5) SSH-Test (verbose) - läuft etwas kürzer mit Timeout:" | tee -a "$LOGFILE"
run_with_timeout 30 ssh -vvv -T git@github.com || true
echo | tee -a "$LOGFILE"

echo "6) git ls-remote mit verbose SSH (mit Trace und Timeout):" | tee -a "$LOGFILE"
echo "---- START git ls-remote (verbose) ----" | tee -a "$LOGFILE"
# setze Git-Trace-Variablen, benutze Wrapper
GIT_TRACE=1 GIT_TRACE_PACKET=1 GIT_SSH_COMMAND="ssh -vvv" run_with_timeout 45 git ls-remote origin || true
echo "---- END git ls-remote (verbose) ----" | tee -a "$LOGFILE"
echo | tee -a "$LOGFILE"

echo "6b) Versuche einen verbose git push (nur testen, mit Trace und Timeout):" | tee -a "$LOGFILE"
echo "---- START git push (verbose) ----" | tee -a "$LOGFILE"
GIT_TRACE=1 GIT_TRACE_PACKET=1 GIT_SSH_COMMAND="ssh -vvv" run_with_timeout 60 git push -v origin HEAD || true
echo "---- END git push (verbose) ----" | tee -a "$LOGFILE"
echo | tee -a "$LOGFILE"

# --- Neu: gezielte Untersuchung, wenn 'git push' scheinbar hängt ---
echo "=== Diagnose: Push-Hangs ===" | tee -a "$LOGFILE"
CURRENT_REMOTE=$(git config --get remote.origin.url || echo "")
echo "Aktuelle Remote-URL: $CURRENT_REMOTE" | tee -a "$LOGFILE"

echo "1) Versuch: non-interaktiver HTTPS-Push mit curl-Verbose (zeigt HTTP-Stalls):" | tee -a "$LOGFILE"
# verhindert interaktives Prompt, zeigt libcurl-Output, low-speed-Timeouts helfen stalls aufzudecken
run_with_timeout 30 sh -c 'GIT_TERMINAL_PROMPT=0 GIT_CURL_VERBOSE=1 GIT_HTTP_LOW_SPEED_LIMIT=1 GIT_HTTP_LOW_SPEED_TIME=10 GIT_TRACE=1 GIT_TRACE_PACKET=1 git push -v origin HEAD' || echo "HTTPS push: timeout/Fehler" | tee -a "$LOGFILE"
echo | tee -a "$LOGFILE"

# Wenn Remote HTTPS ist und der HTTPS-Versuch fehlschlägt, versuche kurz SSH (da SSH-Auth bereits funktioniert)
if [[ "$CURRENT_REMOTE" =~ ^https?:// ]]; then
  echo "2) HTTPS scheint problematisch. Temporär Remote auf SSH umstellen und per SSH pushen (nur Test):" | tee -a "$LOGFILE"
  git remote set-url origin git@github.com:nickyreinert/nickyreinert.de.git 2>&1 | tee -a "$LOGFILE" || true

  run_with_timeout 30 bash -c 'GIT_TRACE=1 GIT_TRACE_PACKET=1 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=10 -vvv" git push -v origin HEAD' || echo "SSH push: timeout/Fehler" | tee -a "$LOGFILE"
  echo | tee -a "$LOGFILE"

  echo "3) Remote-URL wiederherstellen:" | tee -a "$LOGFILE"
  git remote set-url origin "$CURRENT_REMOTE" 2>&1 | tee -a "$LOGFILE" || true
  echo | tee -a "$LOGFILE"
fi

echo "Hinweis: Wenn der HTTPS-Versuch hängt, liegt es oft an: Keychain/Credential-Helper (wartet auf GUI), Netzwerk/Proxy oder GitHub-side rate limiting/policies." | tee -a "$LOGFILE"
echo "Wenn SSH-Push funktioniert: erwäge permanent auf SSH-Remote zu wechseln:" | tee -a "$LOGFILE"
echo "  git remote set-url origin git@github.com:nickyreinert/nickyreinert.de.git" | tee -a "$LOGFILE"

# Zeige evtl. hängende Prozesse, damit sie manuell beendet werden können
echo "9) Aktuelle git/ssh Prozesse (kann auf hängende Prozesse hinweisen):" | tee -a "$LOGFILE"
ps aux | egrep '([g]it|[s]sh)' | sed -n '1,200p' | tee -a "$LOGFILE" || true
echo | tee -a "$LOGFILE"

echo "10) Falls etwas hängt: Beispiel-Kommando zum beenden (prüfen vorher):" | tee -a "$LOGFILE"
echo "  pkill -f 'git .*push'   # oder: kill <pid>" | tee -a "$LOGFILE"
echo | tee -a "$LOGFILE"

echo "8) Hinweise:" | tee -a "$LOGFILE"
echo "- Wenn git ls-remote oder git push nach Timeout abgebrochen wurden, poste die letzten ~50 Zeilen der Logdatei." | tee -a "$LOGFILE"
echo "- Logdatei: $LOGFILE" | tee -a "$LOGFILE"