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
     out["endtime"]=    out_attach["endtime"]   !=null  ?   out_attach["endtime"]   :   out_body["endtime"];
     out["from"]=       out_attach["from"]      !=null  ?   out_attach["from"]      :   out_body["from"];
     out["to"]=         out_attach["to"]        !=null  ?   out_attach["to"]        :   out_body["to"];
     out["agenda"]=     out_attach["agenda"]    !=null  ?   out_attach["agenda"]    :   out_body["agenda"];
     out["from"]=       out_attach["from"]      !=null  ?   out_attach["from"]      :   out_body["from"];
     out['messageId']=  mail.messageId;
     out['tolls']= out_attach["tolls"]!=null && out_attach["tolls"].length>0  ? out_attach["tolls"] : out_body["tolls"];
     if(out['toll']==null || out['toll']=='undefined')
     {
        if(out["tolls"]!=null && out["tolls"] !='undefined' && out["tolls"].length>0)
            out['toll']=out['tolls'][0].Number;
     }

        utility.log('mail parse result.......');
        utility.log(inspect(out));

    //if (!out || !out['toll'] || !out['code'] || !out['subject'] )
     //   return null;

    //if (out['date'] && out['time'])
    //    out['date_time'] = new Date(out['date'] + ", " + out['time']);

    //console.log(JSON.stringify(out));

    

    return out;
}

function remove1stDateOfBody(str){
  var pattern = /Date:(.*)+/;
  var ss = str.replace(pattern, "");
  return ss;
}
function parseBody(mail)
{
    //console.log(inspect(mail));
    var out = null;
    if (mail.text) {
        utility.log('##### fallback to parsing text BODY ######');
        var bodytext=remove1stDateOfBody(mail.text.replace('Sent:','Date:'));
        //var bodytext=remove1stDateOfBody(mail.text);
        //console.log(bodytext);
        out = parseString(bodytext, ':', '\n', true, false);
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
    

    return out;

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

function removeBYHOURfromCalendarRRULE(str){
  var pattern = /;BYHOUR=[0-9]+/g;
  var ss = str.replace(pattern, "");
  return ss;
}

function removeRRULEfromCalendar(str){
  var pattern = /RRULE:(.*)+/g;
  var ss = str.replace(pattern, "");
  return ss;
}

function parseAttachments(attachments)
{
    var out = {};

    for (var i = 0; i < attachments.length; i++) {
        var atch = attachments[i];
        utility.log('##### parsing ATTACHMENT ' + i + ' ######');
        //console.log("CT: "+atch.contentType );
        //console.log(atch.content);
        if (atch.contentType && atch.contentType.match(/calendar/) && atch.content) {

            var str_data = atch.content.toString('utf-8')+'\n';
            str_data=removeBYHOURfromCalendarRRULE(str_data);
            //console.log(str_data);

        var icalendar_res;
        try{
            icalendar_res = icalendar.parse_calendar(str_data);
          }
          catch(err){
            utility.log('Failed to parse caledndar attachment. Error: '+err);
            return;
          }
            //console.log(inspect(icalendar_res, false, Infinity));
            //console.log(icalendar_res);
            var res = {};
            while (!res['toll'] || !res['code']) {
                // case 1, phone and pin in LOCATION

                if (icalendar_res.events()[0].properties.LOCATION) {
                    var LOCATION = icalendar_res.events()[0].properties.LOCATION[0].value;
                   
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
            var dateEnd = new Date(icalendar_res.events()[0].properties.DTEND[0].value);
            out['date_time'] = date.toString();
            var date_split = out['date_time'].split(" ");
            out['date'] = date_split.slice(0, 4).join(" ");
            out['time'] = date;//date_split.slice(4).join(" ");;
            out['endtime']=dateEnd;
            out['subject'] = icalendar_res.events()[0].properties.SUMMARY[0].value;
            //utility.log('B4 return in parse attachment');
            utility.log(out);
            return out;


        
        }
    }
}


////////////////////////////////start field parser ////////////////////////
function parseProvider(str){

var result = str.match(/nsn/i);
if (result){
    return "NSN";
}
result = str.match(/movial/i);
if (result){
    return "Movial";
}
 result = str.match(/webex/i);
if (result){
    return "WebEx";
}
result = str.match(/gotomeeting/i);
if (result){
    return "GoToMeeting";
}

return null;
}

function parsePhoneNumber(str){
  var expr=/\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\W*\d\W*\d\W*\d\W*\d\W*\d\W*\d\W*\d\W*\d\W*(\d{1,2})/g;
  var m=str.match(expr);
  return m;
}

////////////////////////////////end field parser /////////////////////////
function parseString(str, delimiter, endMarker, allowFuzzy, usePattern)
{
      var dict =
    [
  {
    keyword: 'toll',
    alts: 'toll|bridge|dial-in|dial',
    pattern: '[0-9\\-+]+',
    fuzzy: true
  },
  {
    keyword: 'code',   //TODO: renameto'access code'
    alts: 'code|meeting number|access code',
    pattern: '[0-9]+',
    fuzzy: true,
  },
  {
    keyword: 'pin', //TODO: renameto'pin'
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
    alts: 'date|sent',
    pattern: '.+',
    fuzzy: false,
    
  },
  {
    keyword: 'time',
    alts: 'time|when',
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
  {
    keyword: 'country',
    alts: 'United States',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Afghanistan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: ' Albania',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Algeria',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Andorra',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Angola',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Antigua and Barbuda',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Argentina',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Armenia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Aruba',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Australia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Austria',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Azerbaijan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Bahamas, The',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Bahrain',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Bangladesh',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Barbados',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Belarus',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Belgium',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Belize',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Benin',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Bhutan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Bolivia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Bosnia and Herzegovina',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Botswana',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Brazil',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Brunei',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Bulgaria',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Burkina Faso',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Burma',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Burundi',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Cambodia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Cameroon',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Canada',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Cape Verde',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Central African Republic',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Chad',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Chile',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'China',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Colombia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Comoros',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Congo, Democratic Republic of the',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Congo, Republic of the',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Costa Rica',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Cote d',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'Ivoire',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Croatia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Cuba',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Curacao',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Cyprus',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Czech Republic',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Denmark',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Djibouti',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Dominica',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Dominican Republic',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'East Timor',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Ecuador',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Egypt',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'El Salvador',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Equatorial Guinea',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Eritrea',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Estonia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Ethiopia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Fiji',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Finland',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'France',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Gabon',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Gambia, The',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Georgia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Germany',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Ghana',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Greece',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Grenada',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Guatemala',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Guinea',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Guinea-Bissau',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Guyana',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Haiti',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Holy See',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Honduras',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Hong Kong',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Hungary',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Iceland',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'India',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Indonesia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Iran',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Iraq',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Ireland',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Israel',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Italy',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Jamaica',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Japan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Jordan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Kazakhstan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Kenya',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Kiribati',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Korea, North',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Korea, South',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Kosovo',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Kuwait',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Kyrgyzstan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Laos',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Latvia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Lebanon',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Lesotho',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Liberia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Libya',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Liechtenstein',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Lithuania',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Luxembourg',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Macau',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Macedonia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Madagascar',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Malawi',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Malaysia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Maldives',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Mali',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Malta',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Marshall Islands',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Mauritania',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Mauritius',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Mexico',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Micronesia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Moldova',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Monaco',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Mongolia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Montenegro',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Morocco',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Mozambique',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Namibia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Nauru',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Nepal',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Netherlands',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Netherlands Antilles',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'New Zealand',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Nicaragua',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Niger',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Nigeria',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'North Korea',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Norway',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Oman',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Pakistan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Palau',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Palestinian Territories',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Panama',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Papua New Guinea',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Paraguay',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Philippines',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Poland',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Portugal',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Qatar',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Romania',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Russia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Rwanda',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Saint Kitts and Nevis',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Saint Lucia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Saint Vincent and the Grenadines',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Samoa',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'San Marino',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Sao Tome and Principe',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Saudi Arabia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Senegal',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Serbia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Seychelles',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Sierra Leone',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Singapore',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Sint Maarten',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Slovakia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Slovenia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Solomon Islands',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Somalia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'South Africa',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'South Korea',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'South Sudan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Spain',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Sri Lanka',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Sudan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Suriname',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Swaziland',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Sweden',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Switzerland',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Syria',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Taiwan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Tajikistan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Tanzania',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Thailand',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Timor-Leste',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Togo',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Tonga',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Trinidad and Tobago',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Tunisia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Turkey',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Turkmenistan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Tuvalu',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Uganda',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Ukraine',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'United Arab Emirates',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'United Kingdom',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Uruguay',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Uzbekistan',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Vanuatu',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Venezuela',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Vietnam',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Yemen',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Zambia',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  },
  {
    keyword: 'country',
    alts: 'Zimbabwe',
    pattern: '[0-9\\-+]+',
    fuzzy: true,
    
  }
];

    var out = {};
    var tolllist=[];
    var ti=0;
    for (i = 0; i < dict.length; i++) {
        var re = new RegExp('\\b(?:' + dict[i].alts + ')\\b' +
                            (allowFuzzy && dict[i].fuzzy ? '.*' : '(?:\\s*)?') + '[+:]' +
                            '\\s*(' + (usePattern ? dict[i].pattern : '.+') + ')' + endMarker, 'i');
        var match = str.match(re);
        if (match && match.length > 0) {
            if(match[1] !=null){

                if(dict[i].keyword=="country"){
                  tolllist[ti]={MeetingID:'',Country:dict[i].alts,Number:match[1].trim()};
                  ti=ti+1;
                 }
                 else
                     out[dict[i].keyword] = match[1].trim();
            }
            else
                out[dict[i].keyword]=null;
        }
    }

    if(out['toll']==undefined || out['toll']==null || out['toll']=='')
    {
      var nos=parsePhoneNumber(str);
      if(nos !=null && nos !=undefined && nos.length>0)
         out['toll']=nos[0];
    }

    out['provider']=parseProvider(str);
    out['tolls']=tolllist;
    return out;
}


exports.parseMail=parseMail;
exports.parseString=parseString;
