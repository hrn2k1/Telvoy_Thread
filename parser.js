


var inspect = require('util').inspect;
var icalendar = require('icalendar');
var config = require('./config.js');
//var mimelib = require("mimelib-noiconv");
var utility=require('./utility.js');
//var querystring = require("querystring");

var debug = config.IS_DEBUG_MODE;



function parseMail(mail)
{
     //utility.log("<Header......................");
     //utility.log(inspect(mail.headers["authentication-results"], false, Infinity));
     //utility.log("</Header......................");
    if(debug==true)
    utility.log(inspect(mail.messageId, false, Infinity));

    var out_attach = {};
    var out_body = {};
    var out = {};

    if (mail.attachments)
    {
        out_attach = parseAttachments(mail.attachments);
         if(debug==true){
            utility.log('attachment parse result.......');
            utility.log(out_attach);}
    }

    //if (!out)
      out_body = parseBody(mail);
      if(debug==true){
            utility.log('body parse result.......');
            utility.log(out_body);
    }

     out["subject"]=    out_attach["subject"]   !=null  ?   out_attach["subject"]   :   out_body["subject"];
     out["provider"]=   out_attach["provider"]  !=null  ?   out_attach["provider"]  :   out_body["provider"];
     out["toll"]=       out_attach["toll"]      !=null  ?   out_attach["toll"]      :   out_body["toll"];
     out["code"]=       out_attach["code"]      !=null  ?   out_attach["code"]      :   out_body["code"];
     out["password"]=   out_attach["password"]  !=null  ?   out_attach["password"]  :   out_body["password"];
     out["pin"]=        out_attach["pin"]       !=null  ?   out_attach["pin"]       :   out_body["pin"];
     out["date"]=       out_attach["date"]      !=null  ?   out_attach["date"]      :   out_body["date"];
     out["time"]=       out_attach["time"]      !=null  ?   out_attach["time"]      :   out_body["time"];
     out["from"]=       out_attach["from"]      !=null  ?   out_attach["from"]      :   out_body["from"];
     out["to"]=         out_attach["to"]        !=null  ?   out_attach["to"]        :   out_body["to"];
     out["agenda"]=     out_attach["agenda"]    !=null  ?   out_attach["agenda"]    :   out_body["agenda"];
     out["from"]=       out_attach["from"]      !=null  ?   out_attach["from"]      :   out_body["from"];
     out['messageId']=  mail.messageId;

        utility.log('mail parse result.......');
        utility.log(inspect(out));

    //if (!out || !out['toll'] || !out['code'] || !out['subject'] )
     //   return null;

    //if (out['date'] && out['time'])
    //    out['date_time'] = new Date(out['date'] + ", " + out['time']);

    //console.log(JSON.stringify(out));

    

    return out;
}


function parseBody(mail)
{
    //console.log(inspect(mail));
    var out = null;
    if (mail.text) {
        utility.log('##### fallback to parsing text BODY ######');
        out = parseString(mail.text, ':', '\n', true, false);
         //console.log(out);
        //out["body"] = mail.text;
    } else if (mail.html) {
        utility.log('##### fallback to parsing html BODY ######');
        var text = mail.html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>?|&nbsp;/gi, '');
        out = parseString(text, ':', '\n', true, false);
        //console.log(out);
        //out["body"] = mail.html;
    } else {
        return null;
    }

    out["subject"] = mail.subject;
    

    return ou

    /*
    if ( mail.inReplyTo ) {
        // do not post replies, for example vacation notices
        return;
    }

    if ( mail.from ) {
        for ( var i=0; i<mail.from.length; i++ ) {
            var sender = mail.from[i].address.toLowerCase();
            if ( isUser[sender] ) {
                parseAttachments(mail);
                return;
            }
        }
    }

    if ( mail.replyTo ) {
        for ( var i=0; i<mail.replyTo.length; i++ ) {
            var sender = mail.replyTo[i].address.toLowerCase();
            if ( isUser[sender] ) {
                parseAttachments(mail);
                return;
            }
        }
    }

    if ( mail.headers && mail.headers.sender ) {
        var sender = mail.headers.sender.toLowerCase();
        if ( isUser[sender] ) {
            parseAttachments(mail);
            return;
        }
    }
    */

    //var sender = mail.headers && mail.headers.sender ? mail.headers.sender : 'nobody';
    //parseAttachments(mail);

    // X-Sender and other fields?
}

function parseAttachments(attachments)
{
    var out = {};

    for (var i = 0; i < attachments.length; i++) {
        var atch = attachments[i];
        utility.log('##### parsing ATTACHMENT ' + i + ' ######');
        if (atch.contentType && atch.contentType.match(/calendar/) && atch.content) {
            var str_data = atch.content.toString('utf-8');

            var icalendar_res = icalendar.parse_calendar(str_data);

            //console.log(inspect(icalendar_res, false, Infinity));

            var res = {};
            while (!res['toll'] || !res['code']) {
                // case 1, phone and pin in LOCATION
                if (icalendar_res.events()[0].properties.LOCATION) {
                    var LOCATION = icalendar_res.events()[0].properties.LOCATION[0].value;
                    //console.log("<location>"+LOCATION+"</location>");
                    res = parseString(LOCATION, ':', '\\s*', false, true);
                    //console.log(res);
                    if (res['toll'] && res['code'])
                        break;
                }

                // case 2, search in DESCRIPTION
                if (icalendar_res.events()[0].properties.DESCRIPTION) {
                    var DESCRIPTION = icalendar_res.events()[0].properties.DESCRIPTION[0].value;
                    //console.log(DESCRIPTION);
                    var res = parseString(DESCRIPTION, ':', '\\n', true, false);
                    utility.log(res);
                    if (res['toll'] && res['code'])
                        break;
                }

                break;
            }

            //if (!res['toll'] || !res['code'])
             //   return null;
            out['provider']= utility.Nullify(res['provider']);
            out['toll'] = utility.Nullify(res['toll']);
            out['code'] = utility.Nullify(res['code']);
            out['password']=utility.Nullify(res['password']);
            //console.log("$$ :"+icalendar_res.events()[0].properties.DTSTART[0].value);
            var date = new Date(icalendar_res.events()[0].properties.DTSTART[0].value);
            out['date_time'] = date.toString();
            var date_split = out['date_time'].split(" ");
            out['date'] = date_split.slice(0, 4).join(" ");
            out['time'] = date;//date_split.slice(4).join(" ");;

            out['subject'] = icalendar_res.events()[0].properties.SUMMARY[0].value;
            utility.log('B4 return in parse attachment');
            utility.log(out);
            return out;
        }
    }
}
////////////////////////////////start field parser ////////////////////////
function parseProvider(str){
    var result = str.match(/webex/i);
if (result){
    return "WebEx";
}
result = str.match(/gotomeeting/i);
if (result){
    return "GoToMeeting";
}

return null;
}



////////////////////////////////end field parser /////////////////////////
function parseString(str, delimiter, endMarker, allowFuzzy, usePattern)
{
    var dict =
    [
        {
            keyword: 'toll', // TODO: rename to 'phone'
            alts: 'toll|bridge|dial-in|dial',
            pattern: '[0-9\\-+]+',
            fuzzy: true,
        },
        {
            keyword: 'code', // TODO: rename to 'access code'
            alts: 'code|meeting number|access code',
            pattern: '[0-9]+',
            fuzzy: true,
        },
        {
            keyword: 'pin', // TODO: rename to 'pin'
            alts: 'pin|secrete',
            pattern: '[0-9]+',
            fuzzy: true,
        },
        {
            keyword: 'password',
            alts: 'password',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'date',
            alts: 'date',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'time',
            alts: 'time',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'to',
            alts: 'to',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'from',
            alts: 'from',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'subject',
            alts: 'subject',
            pattern: '.+',
            fuzzy: false,
        },
        {
            keyword: 'agenda',
            alts: 'topic|agenda',
            pattern: '.+',
            fuzzy: false,
        },
    ];

    var out = {};

    for (i = 0; i < dict.length; i++) {
        var re = new RegExp('\\b(?:' + dict[i].alts + ')\\b' +
                            (allowFuzzy && dict[i].fuzzy ? '.*' : '(?:\\s*)?') + '[+:]' +
                            '\\s*(' + (usePattern ? dict[i].pattern : '.+') + ')' + endMarker, 'i');
        var match = str.match(re);
        if (match && match.length > 0) {
            if(match[1] !=null)
                out[dict[i].keyword] = match[1].trim();
            else
                out[dict[i].keyword]=null;
        }
    }
    out['provider']=parseProvider(str);
    return out;
}


exports.parseMail=parseMail;
exports.parseString=parseString;