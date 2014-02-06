 var mailer= require('./mailsender.js');

function Nullify(objval)
{
    return !objval?null:objval;
}
function isNull(objval,nullval)
{
    return !objval?nullval:objval;
}
function convertToDateTime(date,time)
{
    console.log(typeof(time));
    //console.log("Start convertToDateTime with parameter date ="+date+", time="+time);
if(typeof(time)=="object")
    return time;
var times=time.split(",");
//console.log(times);
var strDateTime=date+" "+times[0]+" "+times[2].replace(")","");
//console.log(strDateTime);
var dt=new Date(strDateTime);
return dt;
}
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

function log(msg,type){
if(type==null || type=='undefined' )
    type='NORMAL';
var dt=new Date();
if(typeof(msg)=='object')
    msg=JSON.stringify(msg);
var msgtext=dt.toISOString()+'>> '+ type+': '+msg;
console.log(msgtext);

if(type=='ERROR')
    mailer.sendMail("Error Occured.",msgtext,"harun@nordicsoft.com.bd");

}

exports.Nullify=Nullify;
exports.isNull=isNull;
exports.generateUid=generateUid;
exports.convertToDateTime=convertToDateTime;
exports.log=log;