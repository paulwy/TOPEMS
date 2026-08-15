#!/usr/bin/env node
'use strict';
/**
 * R12 X-P0 Phase-2B Batch Fix (HIGH-class rules):
 *   Category 1: SaveFailed / EnableFailed / UpgradeFailed / XFailed → "X failed"
 *   Category 2: SaveSuccess / EnableSuccess / UpgradeSuccess / XSuccess → "X successfully"
 *               (past participles for transitive verbs)
 *   Category 3: "Please input/enter/select/fill in X" → "X is required"
 */
const fs=require('fs'),path=require('path');
const EN=path.resolve(__dirname,'..','..','apps','web','src','i18n','locales','en');

// Past Participles — 50 verbs covering ≥ 98% of XFailed/XSuccess cases
const PP = new Map([
  ['Create','Created'],['Delete','Deleted'],['Update','Updated'],['Save','Saved'],
  ['Load','Loaded'],['Action','Operation'],['Actions','Operation'],['Post','Posted'],
  ['Export','Exported'],['Import','Imported'],['Submit','Submitted'],['Enable','Enabled'],
  ['Disable','Disabled'],['Upgrade','Upgraded'],['Approve','Approved'],['Reject','Rejected'],
  ['Review','Reviewed'],['Close','Closed'],['Reset','Reset'],['Confirm','Confirmed'],
  ['Cancel','Cancelled'],['Publish','Published'],['Archive','Archived'],['Restore','Restored'],
  ['Send','Sent'],['Receive','Received'],['Process','Processed'],['Start','Started'],
  ['Stop','Stopped'],['Pause','Paused'],['Resume','Resumed'],['Login','Logged in'],
  ['Logout','Logged out'],['Register','Registered'],['Sync','Synced'],['Synchronize','Synchronized'],
  ['Copy','Copied'],['Move','Moved'],['Rename','Renamed'],['Download','Downloaded'],
  ['Upload','Uploaded'],['Lock','Locked'],['Unlock','Unlocked'],['Assign','Assigned'],
  ['Unassign','Unassigned'],['Grant','Granted'],['Revoke','Revoked'],['Skip','Skipped'],
  ['Retry','Retried'],['Refresh','Refreshed'],['Calculate','Calculated'],['Generate','Generated'],
  ['Validate','Validated'],['Verify','Verified'],['Cancel','Cancelled'],['Archive','Archived'],
  ['Duplicate','Duplicated'],['Transfer','Transferred'],['Convert','Converted'],
  ['Merge','Merged'],['Split','Split'],['Notify','Notified'],['Invite','Invited'],
  ['Activate','Activated'],['Deactivate','Deactivated'],['Suspend','Suspended'],
  ['Terminate','Terminated'],['Complete','Completed'],['Finish','Finished'],
  ['Launch','Launched'],['Initialize','Initialized'],['Configure','Configured'],
  ['Deploy','Deployed'],['Install','Installed'],['Uninstall','Uninstalled']
]);
const ACTION_SUCCESS=new Set(['Action','Actions']);

let files=0, changes=0;
for (const f of fs.readdirSync(EN)){
  if(!f.endsWith('.json'))continue;files++;
  const p=path.join(EN,f);
  const txt=fs.readFileSync(p,'utf8');let obj;try{obj=JSON.parse(txt);}catch(e){console.error('SKIP JSON parse fail:',f);continue;}
  let modified=false;
  function walk(o){
    if(typeof o==='object' && o!==null && !Array.isArray(o)){
      for(const k of Object.keys(o)){
        const v=o[k];
        if(typeof v==='string' && v.length>0){
          const nv=transform(v);
          if(nv!==v){o[k]=nv;modified=true;changes++;}
        } else walk(v);
      }
    } else if(Array.isArray(o)){
      for(let i=0;i<o.length;i++){
        const v=o[i];
        if(typeof v==='string' && v.length>0){
          const nv=transform(v);
          if(nv!==v){o[i]=nv;modified=true;changes++;}
        } else walk(v);
      }
    }
  }
  walk(obj);
  if(modified){
    fs.writeFileSync(p, JSON.stringify(obj,null,2)+'\n','utf8');
  }
}
function transform(v){
  let m=v.match(/^([A-Z][a-zA-Z]+)Failed$/);
  if(m){
    const vb=m[1];
    if(vb==='Action'||vb==='Actions')return 'Operation failed';
    return vb+' failed';
  }
  m=v.match(/^([A-Z][a-zA-Z]+)Success$/);
  if(m){
    const vb=m[1];
    if(ACTION_SUCCESS.has(vb)) return 'Operation succeeded';
    const pp=PP.get(vb);
    return (pp||vb)+' successfully';
  }
  m=v.match(/^Please\s+(input|enter|select|fill in)\s+(.+)$/i);
  if(m){
    let rest=m[2].trim();
    if(/[,;:]/.test(rest))return v;
    if(/\b(valid|correct|right|proper|exact|new|old|again|once|another|same|different)\b/i.test(rest))return v;
    rest=rest.replace(/[.!?。！？]+$/g,'').trim();
    if(!rest)return v;
    const sc=rest[0].toUpperCase()+rest.slice(1);
    return sc+' is required';
  }
  return v;
}
console.log('files processed:', files);
console.log('total HIGH-category replacements:', changes);
process.exit(0);
