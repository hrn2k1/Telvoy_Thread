var mpns = require('mpns');
var config=require('./config.js');
var utility=require('./utility.js');

 var mailer= require('./mailsender.js');


var debug = config.IS_DEBUG_MODE;

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}



function InsertMeetingInvitees (EmailAddresses,Invitees,invID,addresses,i,callback) {
if(i<addresses.length){
  
   EmailAddresses.findOne({EmailID: addresses[i].address,Verified:true}, function(error, result1){
                if(!error){
                  if(result1==null){
                    utility.log(addresses[i].address+' not found in white list');
                      //send email
                     
                    mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,addresses[i].address);
                    InsertMeetingInvitees(EmailAddresses,Invitees,invID,addresses,i+1,callback);
                  }
                  else{
                    //var userID = result1.UserID;
                    var entity = {
                    "UserID": result1.UserID,
                    "EmailID": result1.EmailID,
                    "Invitations_id": invID
                  };
                   utility.log('invitee object to insert');
                   utility.log(entity);
                  Invitees.insert(entity,function(e,r){
                    if(e){
                       utility.log("insert Invitee error: " + e, 'ERROR');
                       // 
                    }
                    else
                    {
                     mailer.sendMail(config.ATTENDEE_EMAIL_SUBJECT,config.ATTENDEE_EMAIL_BODY,result1.EmailID);
                     utility.log('Parsed Success email sent to '+result1.EmailID);
                     // 
                     InsertMeetingInvitees(EmailAddresses,Invitees,invID,addresses,i+1,callback);
                   }
                  });
                 
                    
                  }
                  
                }
              });
}
else{
  utility.log('EmailAddresses processed completed');
  if(callback !=null)
    callback();
}
  // body...
}

function InsertMeetingTolls(connection,localtolls){
  
  if(localtolls==null) return;
  if(localtolls.length==0) return;
  utility.log("Meeting Tolls to insert");
  utility.log(localtolls);
  if(connection==null) {
      utility.log('database connection is null','ERROR');
     
      return;
  }
      var Tolls = connection.collection('MeetingTolls');
      Tolls.insert(localtolls,function(err,rslt){
          if(err){
            utility.log('Insert MeetingTolls Error: '+err,'ERROR');
             
          }
          else{
            utility.log("Successfully Inserted "+localtolls.length+" Meeting Tolls.");
             
          }
      });
      

}

function insertInvitationEntity(connection,entity,addresses,localtolls)
{
   if(localtolls!=null && localtolls.length>0){
    for (var i = 0; i < localtolls.length; i++) {
      localtolls[i].MeetingID=entity.AccessCode;
    };
   }

if(connection==null) {
      utility.log('database connection is null','ERROR');
     
      return;
  }
  var Invitations = connection.collection('Invitations');
  var Invitees = connection.collection('Invitees');
  var EmailAddresses = connection.collection('EmailAddresses');

 EmailAddresses.findOne({"EmailID":entity.FromEmail,"Verified":true},function(senderError,sender){
 if(senderError){
  utility.log('Error in finding sender email in whitelist','ERROR');
  return;
 }
 else{
  if(sender==null){
    utility.log('Sender Email address '+ entity.FromEmail +' is not found in whitelist.');
     mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,entity.FromEmail);
    return;
  }
  else{
    utility.log('Sender Email '+entity.FromEmail+' is found in whitelist with userID '+sender.UserID);
    //////////////////////Start Invitation Process/////////////

    Invitations.findOne({"AccessCode": entity.AccessCode}, function(error, result_invite){
    if(error){
      utility.log("Error in find invitation with AccessCode to check duplicate" + error,'ERROR');
        
    } else{
      //console.log("Invitation  found nor" + result_invite);
        if(result_invite == null){
         Invitations.insert(entity, function(error, result) {
          if(error)
          {
            utility.log("insertInvitationEntity() error: " + error, 'ERROR');
             
          }
          else
          {
            utility.log('insert invitation result.........');
            utility.log(result);
            utility.log("Invitation inserted Successfully");
            InsertMeetingInvitees(EmailAddresses,Invitees,result[0]._id,addresses,0,function(){ InsertMeetingTolls(connection,localtolls);});
            //   
            
          }
        });
      }
      else{
        utility.log("Invitation already exist for AccessCode: "+result_invite.AccessCode);
        Invitations.update({"_id":result_invite._id}, {$set:entity}, function(error,result){
          if(error)
          {
            utility.log("update error in insertInvitationEntity() error: " + error, 'ERROR');
             
          }
          else
          {
            utility.log('update invitation result.........');
            utility.log(result);
            utility.log("Invitation updated Successfully");
            Invitees.remove({Invitations_id:result_invite._id},function(err,res){
              if(err){
              utility.log("delete error in insertInvitationEntity() error: " + error, 'ERROR');
               
              }
              else{
                utility.log('deleted all previous invitees.')
                 InsertMeetingInvitees(EmailAddresses,Invitees,result_invite._id,addresses,0,function(){ InsertMeetingTolls(connection,localtolls);});
              }
            });
           
            //   
            
          }
        });
      }
    }
  });

    //////////////////////End Invitation Process//////////////
  }
 }

 });
  


}








function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes*60000);
}
function minutesDiff(start, end){
  var diff = start.getTime() - end.getTime(); // this is a time in milliseconds
  return parseInt(diff/(1000*60));
}

/// Method to send/push notification to MPNS
function PushNotification(connection,notificationRemainderTime)
{


  if(connection==null) {
      utility.log('database connection is null','ERROR');
     
      return;
  }

  var Invitations = connection.collection('Invitations');
  var Invitees = connection.collection('Invitees');
  var Registrations = connection.collection('Registrations');
  
  var sttime =  addMinutes(new Date(), 0);
  //console.log(sttime);
  // var edtime = addMinutes(new Date(), notificationRemainderTime/(1000*60));
  var edtime = addMinutes(new Date(), (24*60));
  //console.log(edtime);
  var invtime = {
    InvTime: {
      $gte: sttime,
      $lte: edtime
    }
  }
 
  Invitations.find(invtime).toArray( function(error, invites) {
    if(error)
    {
      utility.log("find Invitations error: " + error, 'ERROR');
       
    }
    else
    {
      if(debug==true)
      {
      utility.log("eligible invitations for push");
      utility.log(invites);
      }
      var pushInfo = [];
      //for (var i = 0; i < invites.length; i++) {
        invites.forEach(function(inv,i){
        // pushInfo["Subject"] = invites[i].Subject;
        // pushInfo["Agenda"] = invites[i].Agenda;
        // pushInfo["InvTime"] = invites[i].InvTime;

          // Invitations_ids.push(invites[i]._id);
          Invitees.find({Invitations_id: inv._id}).toArray( function(error, invitees) {
            if(error)
            {
              utility.log("find Invitees error: " + error, 'ERROR');
               
            }
            else
            {
              if(debug==true)
              {
              utility.log("eligible invitees for push");
              utility.log(invitees);
              }

              //for (var j = 0; j < invitees.length; j++) {
                invitees.forEach(function(att,j){
                //pushInfo["UserID"] = invitees[j].UserID;

                Registrations.findOne({UserID: att.UserID.trim()}, function(error, registrations) {
                  if(error)
                  {
                    utility.log("find registration error: " + error, 'ERROR');
                     
                  }
                  else
                  {
                    if(debug==true)
                    {
                    utility.log('Invitees Push URL Info' );
                    utility.log(registrations);
                    }
                    // console.log("Inv ID: "+invites[i]._id);
                    // console.log(invitees[j]);
                    // console.log(registrations); RemainderMinute
                    if(registrations != null)
                    {

                        //console.log(inv);
                      var RemainderMinute = registrations.RemainderMinute;
                       var md = minutesDiff( inv.InvTime,new Date());
                      if(md<=50){
                      utility.log("Remainder Time for "+att.UserID +" is "+RemainderMinute+" minutes");
                     
                      utility.log("meeting "+inv.Subject+" of "+att.UserID+" remaining minute: "+md);
                      
                      

                      if(md <= RemainderMinute && RemainderMinute >-1 ){
                        //pushInfo["PushUrl"] = registrations.Handle;
                        var tileObj = {
                                  'title': inv.Subject,
                                  'backTitle': "Next Conference",
                                  'backBackgroundImage': "/Assets/Tiles/BackTileBackground.png",
                                  'backContent': inv.Agenda+"("+md+" minutes remaining)"
                                  };
                        mpns.sendTile(registrations.Handle, tileObj, function(){utility.log('Pushed to ' + att.UserID+" for "+inv.Subject);});
                      }
                    }
                    
                      // 
                    } 
                    // else {
                    //   pushInfo["PushUrl"] =null;
                    //   utility.log("Can't find push URL for "+pushInfo["UserID"]+" . so can't push notification.",'WARNING');
                    // }
                    // console.log(pushInfo);

                  }
                });
              });
            }
          });
          
        }); 
        //return JSON.stringify(result);
        // response.setHeader("content-type", "text/plain";
        // response.write("{\"Tolls\":" + JSON.stringify(result.Toll) + "}";
        // response.end();
      }
    });

}












/// Exposes all methods to call outsite this file, using its object   
exports.insertInvitationEntity=insertInvitationEntity;
exports.PushNotification=PushNotification
