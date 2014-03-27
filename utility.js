 var mailer= require('./mailsender.js');
  var config = require('./config.js');
  var fs = require('fs');
  var moment = require('moment');

function Nullify(objval)
{
    return !objval?null:objval;
}
function isNull(objval,nullval)
{
    return !objval?nullval:objval;
}

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}
function log(msg,type){
    //if(config.IS_DEBUG_MODE==false) return;

    var log_filename= replaceAll('-','',new Date().toISOString().split('T')[0])+'.log';
    //console.log(log_filename);
if(type==null || type=='undefined' )
    type='NORMAL';
var dt=new Date();
if(typeof(msg)=='object')
    msg=JSON.stringify(msg);
var msgtext=dt.toISOString()+'>> '+ type+': '+msg+'\n';
//console.log(msgtext);
fs.appendFile(log_filename, msgtext, encoding='utf8', function (err) {
    if (err) {console.log('File Write Error: '+err);}
});

if(type=='ERROR')
    mailer.sendMail("Error Occured(Thread Site).",msgtext,"harun@nordicsoft.com.bd");

}
function logOnly(msg,type){
    //if(config.IS_DEBUG_MODE==false) return;

    var log_filename= replaceAll('-','',new Date().toISOString().split('T')[0])+'.log';
    //console.log(log_filename);
if(type==null || type=='undefined' )
    type='NORMAL';
var dt=new Date();
if(typeof(msg)=='object')
    msg=JSON.stringify(msg);
var msgtext=dt.toISOString()+'>> '+ type+': '+msg+'\n';
//console.log(msgtext);
fs.appendFile(log_filename, msgtext, encoding='utf8', function (err) {
    if (err) {console.log('File Write Error: '+err);}
});



}
function debug(msg,type){

if(config.IS_DEBUG_MODE==false) return;
var log_filename= replaceAll('-','',new Date().toISOString().split('T')[0])+'.log';
if(type==null || type=='undefined' )
    type='NORMAL';
var dt=new Date();
if(typeof(msg)=='object')
    msg=JSON.stringify(msg);
var msgtext=dt.toISOString()+'>> '+ type+': '+msg+'\n';
//console.log(msgtext);
fs.appendFile(log_filename, msgtext, encoding='utf8', function (err) {
    if (err) {console.log('File Write Error: '+err);}
});

if(type=='ERROR')
    mailer.sendMail("Error Occured(Thread Site).",msgtext,"harun@nordicsoft.com.bd");

}

//...................................
var keywords=[
"Fri","Friday",
"Sat","Saturday",
"Sun","Sunday",
"Mon","Monday",
"Tue","Tuesday",
"Wed","Wednesday",
"Thu","Thursday",
"Jan","January",
"Feb","February",
"Mar","March",
"Apr","April",
"May","May",
"Jun","June",
"Jul","July",
"Aug","August",
"Sep","September",
"Oct","October",
"Nov","November",
"Dec","December",
"GMT","UTC",
"+","-",":"," ",
"AM","PM"
];
function isKeyword(str){

    for (var i = 0; i < keywords.length; i++) {
        if(keywords[i].toLowerCase()==str.toLowerCase())
        {
            return true;
        }
    };

    return false;
}

function Beautify(str){
    var words=str.match(/[\s=)(:,+-]|[^\s=)(:,+-]+/g);
    var bstr="";
    for (var i = 0; i < words.length; i++) {
        if(isKeyword(words[i])==true || !isNaN(words[i]))
            bstr+=words[i];
    };
    return bstr;
}

function DateTimeParse(str){
    try{
    var dat=moment(str);
    if(dat._d !="Invalid Date")
        return dat._d;
    else
    {
        var beautyDT=Beautify(str);
        console.log('Beautify:',beautyDT);
        dat=moment(beautyDT);
        if(dat._d !="Invalid Date")
        return dat._d;
        else
        {
            return "Invalid Date";
        }
    }
}
catch(ex){
    throw ex;
}
     
}

function convertToDate(date){
try{
    if(typeof(date)=="object")
        return date;
    else
        return DateTimeParse(date);
}
catch(ex){
    log("Date Parse Error: "+ex.toString(),'ERROR');
    return "";
 }
}
function convertToDateTime(date,time)
{
    //console.log(typeof(time));
    //console.log("Start convertToDateTime with parameter date ="+date+", time="+time);
try{
    if(typeof(time)=="object")
        return time;
     var parsetime;
     parsetime=DateTimeParse(time);
     if(parsetime !="Invalid Date")
        return parsetime;
     else
     {
        var strDateTime=date+" "+ time;
        parsetime=DateTimeParse(strDateTime);
        if(parsetime !="Invalid Date")
            return parsetime;
        else
            return new Date();
     }
 }
 catch(ex){
    log("DateTime Parse Error: "+ex.toString(),'ERROR');
    return "";
 }

/*var times=time.split(",");
//console.log(times);
var strDateTime=date+" "+times[0]+" "+times[2].replace(")","");
//console.log(strDateTime);
var dt=new Date(strDateTime);
return dt;*/
}
//..................................
 function generateUid(separator) {
    /// <summary>
    ///    Creates a unique id for identification purposes.
    /// </summary>
    /// <param name="separator" type="String" optional="true">
    /// The optional separator for grouping the generated segmants: default "-".    
    /// </param>

    var delim = separator || "-";

    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return (S4() + S4() + delim + S4() + delim + S4() + delim + S4() + delim + S4() + S4() + S4());
};


exports.Nullify=Nullify;
exports.isNull=isNull;
exports.generateUid=generateUid;
exports.convertToDate=convertToDate;
exports.convertToDateTime=convertToDateTime;
exports.log=log;
exports.debug=debug;
exports.logOnly=logOnly;
