#!/usr/bin/env node
'use strict';
/**
 * R12 X-P0 Phase-2B Batch Fix (MEDIUM-class rules):
 *   A) §2 Buttons: CamelCase merge → space split, e.g. ConfirmDelete → Confirm Delete
 *   B) §1 Labels Time: CamelCase with suffix Time/At/On/Date → space split
 *   C) Generic CamelCase: ≥10 chars with 2+ capitals → split
 */
const fs = require('fs'),
  path = require('path');
const EN = path.resolve(__dirname, '..', '..', 'apps', 'web', 'src', 'i18n', 'locales', 'en');
const BTN_ENDINGS = [
  'Cancel',
  'Confirm',
  'Details',
  'Edit',
  'Save',
  'Delete',
  'Submit',
  'Approve',
  'Reject',
  'Review',
  'Close',
  'Reset',
  'Deleted',
  'Created',
  'Updated',
  'Saved',
  'Loaded',
  'Enabled',
  'Disabled',
  'Exported',
  'Imported',
  'Submitted',
  'Approved',
  'Rejected',
  'Reviewed',
  'Closed',
  'Published',
  'Archived',
  'Restored',
  'Sent',
  'Received',
  'Processed',
  'Started',
  'Stopped',
  'Paused',
  'Resumed',
  'Synced',
  'Copied',
  'Moved',
  'Renamed',
  'Downloaded',
  'Uploaded',
  'Locked',
  'Unlocked',
  'Assigned',
  'Unassigned',
  'Granted',
  'Revoked',
  'Skipped',
  'Retried',
  'Refreshed',
  'Calculated',
  'Generated',
  'Validated',
  'Verified',
  'Duplicated',
  'Transferred',
  'Converted',
  'Merged',
  'Notified',
  'Invited',
  'Activated',
  'Deactivated',
  'Suspended',
  'Terminated',
  'Completed',
  'Finished',
  'Launched',
  'Initialized',
  'Configured',
  'Deployed',
  'Installed',
  'Uninstalled',
];
const BTN_RE = new RegExp('^([A-Z][a-zA-Z]+)(' + BTN_ENDINGS.join('|') + ')$');
const TIME_SUF_RE = /^[A-Z][a-zA-Z0-9]+(Time|At|On|Date)$/;

let files = 0,
  changes = 0;
for (const f of fs.readdirSync(EN)) {
  if (!f.endsWith('.json')) continue;
  files++;
  const p = path.join(EN, f);
  const txt = fs.readFileSync(p, 'utf8');
  let obj;
  try {
    obj = JSON.parse(txt);
  } catch (e) {
    continue;
  }
  let mod = false;
  function walk(o) {
    if (typeof o === 'object' && o !== null && !Array.isArray(o)) {
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'string' && v.length > 0) {
          const nv = medFix(v);
          if (nv !== v) {
            o[k] = nv;
            mod = true;
            changes++;
          }
        } else walk(v);
      }
    } else if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) {
        const v = o[i];
        if (typeof v === 'string' && v.length > 0) {
          const nv = medFix(v);
          if (nv !== v) {
            o[i] = nv;
            mod = true;
            changes++;
          }
        } else walk(v);
      }
    }
  }
  walk(obj);
  if (mod) fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function medFix(v) {
  if (/\s/.test(v)) return v;
  const m = v.match(BTN_RE);
  if (m) {
    const prefix = m[1],
      suffix = m[2];
    if (prefix.length >= 6 && /[A-Z]/.test(prefix.slice(1))) return splitCaps(v).join(' ');
    return prefix + ' ' + suffix;
  }
  if (v.length >= 8 && TIME_SUF_RE.test(v) && /[a-z][A-Z]/.test(v)) {
    return splitCaps(v).join(' ');
  }
  if (v.length >= 10 && !/^[A-Z0-9_]+$/.test(v) && /[a-z]/.test(v) && /[A-Z].*[A-Z]/.test(v) && !/\s/.test(v)) {
    const parts = splitCaps(v);
    if (parts.length >= 3) return parts.join(' ');
  }
  return v;
}
function splitCaps(s) {
  const out = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= 'A' && c <= 'Z') {
      if (cur && i > 0 && ((s[i - 1] >= 'a' && s[i - 1] <= 'z') || (s[i - 1] >= '0' && s[i - 1] <= '9'))) {
        out.push(cur);
        cur = c;
      } else if (cur && i + 1 < s.length && s[i + 1] >= 'a' && s[i + 1] <= 'z') {
        out.push(cur);
        cur = c;
      } else cur += c;
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}
console.log('files:', files, 'medium changes:', changes);
