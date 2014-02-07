var mpns = require('mpns');
var config=require('./config.js');
var utility=require('./utility.js');
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var monk = require('monk');
 var mailer= require('./mailsender.js');
 var parser=require('./parser.js');
 var mimelib = require("mimelib-noiconv");

var debug = config.IS_DEBUG_MODE;

function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
}



function InsertMeetingInvitees (EmailAddresses,Invitees,invID,addresses,i,callback) {
if(i<addresses.length){
  
   EmailAddresses.findOne({EmailID: addresses[i].address}, function(error, result1){
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
                   console.log('invitee object to insert');
                   console.log(entity);
                  Invitees.insert(entity,function(e,r){
                    if(e){
                       utility.log("insert Invitee error: " + e, 'ERROR');
                       //connection.close();
                    }
                    else
                    {
                     mailer.sendMail(config.ATTENDEE_EMAIL_SUBJECT,config.ATTENDEE_EMAIL_BODY,result1.EmailID);
                     utility.log('Parsed Success email sent to '+result1.EmailID);
                     //connection.close();
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



function insertInvitationEntity(entity,addresses)
{
  mongo.MongoClient.connect(config.MONGO_CONNECTION_STRING, function(err, connection) {
  var Invitations = connection.collection('Invitations');
  var Invitees = connection.collection('Invitees');
  var EmailAddresses = connection.collection('EmailAddresses');

  

  Invitations.findOne({"AccessCode": entity.AccessCode}, function(error, result_invite){
    if(error){
      utility.log("Error in find invitation with AccessCode to check duplicate" + error,'ERROR');
       connection.close();
    } else{
      //console.log("Invitation  found nor" + result_invite);
        if(result_invite == null){
         Invitations.insert(entity, function(error, result) {
          if(error)
          {
            utility.log("insertInvitationEntity() error: " + error, 'ERROR');
            connection.close();
          }
          else
          {
            utility.log('insert invitation result.........');
            console.log(result);
            utility.log("Invitation inserted Successfully");
            InsertMeetingInvitees(EmailAddresses,Invitees,result[0]._id,addresses,0,null);
            //connection.close();  
            
          }
        });
      }
      else{
        utility.log("Invitation already exist for AccessCode: "+result_invite.AccessCode);
        Invitations.update({"_id":result_invite._id}, {$set:entity}, function(error,result){
          if(error)
          {
            utility.log("update error in insertInvitationEntity() error: " + error, 'ERROR');
            connection.close();
          }
          else
          {
            utility.log('update invitation result.........');
            console.log(result);
            utility.log("Invitation updated Successfully");
            Invitees.remove({Invitations_id:result_invite._id},function(err,res){
              if(err){
              utility.log("delete error in insertInvitationEntity() error: " + error, 'ERROR');
              connection.close();
              }
              else{
                utility.log('deleted all previous invitees.')
                 InsertMeetingInvitees(EmailAddresses,Invitees,result_invite._id,addresses,0,null);
              }
            });
           
            //connection.close();  
            
          }
        });
      }
    }
  });
});

}



function insertInvitationEntity_backdated(entity,addresses)
{
  mongo.MongoClient.connect(config.MONGO_CONNECTION_STRING, function(err, connection) {
  var Invitations = connection.collection('Invitations');
  var Invitees = connection.collection('Invitees');
  var EmailAddresses = connection.collection('EmailAddresses');

  

  Invitations.findOne({"AccessCode": entity.AccessCode}, function(error, result_invite){
    if(error){
      console.log("Error in find invitation with AccessCode to check duplicate" + error);
    } else{
      //console.log("Invitation  found nor" + result_invite);
        if(result_invite == null){
         Invitations.insert(entity, function(error, result) {
          if(error)
          {
            utility.log("insertInvitationEntity() error: " + error, 'ERROR');
            connection.close();
          }
          else
          {
            console.log('insert invitation result.........||');
            console.log(result);
            utility.log("Invitation inserted Successfully");
            for (var i = 0; i < addresses.length; i++) {
              //var emailID = addresses[i].address;
              EmailAddresses.findOne({EmailID: addresses[i].address}, function(error, result1){
                if(!error){
                  if(result1==null){
                    utility.log(addresses[i].address+' not found in white list');
                      //send email
                     
                    mailer.sendMail(config.NOT_WHITELISTED_EMAIL_SUBJECT,config.NOT_WHITELISTED_EMAIL_BODY,addresses[i].address);
                  
                  }
                  else{
                    //var userID = result1.UserID;
                    var entity = {
                    "UserID": result1.UserID,
                    "EmailID": result1.EmailID,
                    "Invitations_id": result[0]._id
                  };
                   console.log('invitee object to insert');
                   console.log(entity);
                  Invitees.insert(entity,function(e,r){
                    if(e){
                       utility.log("insert Invitee error: " + e, 'ERROR');
                       //connection.close();
                    }
                    else
                    {
                     mailer.sendMail(config.ATTENDEE_EMAIL_SUBJECT,config.ATTENDEE_EMAIL_BODY,result1.EmailID);
                     //connection.close();
                   }
                  });
                 
                    
                  }
                  
                }
              });
            }
            //connection.close();  
            
          }
        });
      }
      else{
        console.log("Invitation already exist for AccessCode: "+entity.AccessCode);
      }
    }
  });
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

function PushNotification(notificationRemainderTime)
{


  mongo.MongoClient.connect(config.MONGO_CONNECTION_STRING, function(err, connection) {

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
      connection.close();
    }
    else
    {
      if(debug==false)
      {
      utility.log("eligible invitations for push");
      console.log(invites);
      }
      var pushInfo = [];
      for (var i = 0; i < invites.length; i++) {
         
        pushInfo["Subject"] = invites[i].Subject;
        pushInfo["Agenda"] = invites[i].Agenda;
        pushInfo["InvTime"] = invites[i].InvTime;

          // Invitations_ids.push(invites[i]._id);
          Invitees.find({Invitations_id: invites[i]._id}).toArray( function(error, invitees) {
            if(error)
            {
              utility.log("find Invitees error: " + error, 'ERROR');
              connection.close();
            }
            else
            {
              if(debug==true)
              {
              utility.log("eligible invitees for push");
              console.log(invitees);
              }

              for (var j = 0; j < invitees.length; j++) {
                
                pushInfo["UserID"] = invitees[j].UserID;

                Registrations.findOne({UserID: invitees[j].UserID.trim()}, function(error, registrations) {
                  if(error)
                  {
                    utility.log("find registration error: " + error, 'ERROR');
                    connection.close();
                  }
                  else
                  {
                    if(debug==true)
                    {
                    utility.log('Invitees Push URL Info' );
                    console.log(registrations);
                    }
                    // console.log("Inv ID: "+invites[i]._id);
                    // console.log(invitees[j]);
                    // console.log(registrations); RemainderMinute
                    if(registrations != null)
                    {

                        //console.log(pushInfo);
                      var RemainderMinute = registrations.RemainderMinute;
                      utility.log("Remainder Time for "+pushInfo["UserID"] +" is "+RemainderMinute+" minutes");
                      var md = minutesDiff( pushInfo["InvTime"],new Date());
                      utility.log("meeting "+pushInfo["Subject"]+" of "+pushInfo["UserID"]+" remaining minute: "+md);
                      
                      if(md <= RemainderMinute){
                        pushInfo["PushUrl"] = registrations.Handle;
                        var tileObj = {
                                  'title': pushInfo["Subject"],
                                  'backTitle': "Next Conference",
                                  'backBackgroundImage': "/Assets/Tiles/BackTileBackground.png",
                                  'backContent': pushInfo["Agenda"]+"("+md+" minutes remaining)"
                                  };
                        mpns.sendTile(pushInfo["PushUrl"], tileObj, function(){utility.log('Pushed to ' + pushInfo["UserID"]);});
                      }
                      //connection.close();
                    } 
                    // else {
                    //   pushInfo["PushUrl"] =null;
                    //   utility.log("Can't find push URL for "+pushInfo["UserID"]+" . so can't push notification.",'WARNING');
                    // }
                    // console.log(pushInfo);

                  }
                });
              }
            }
          });
          
        }
        //return JSON.stringify(result);
        // response.setHeader("content-type", "text/plain";
        // response.write("{\"Tolls\":" + JSON.stringify(result.Toll) + "}";
        // response.end();
      }
    });
});
}





function PushNotification_back(notificationRemainderTime)
{

mongo.MongoClient.connect(config.MONGO_CONNECTION_STRING, function(err, connection) {

  var Invitations = connection.collection('Invitations');
  var Invitees = connection.collection('Invitees');
  var Registrations = connection.collection('Registrations');
  var sttime = new Date(); //addMinutes(new Date(), -99999999);
  //console.log(sttime);
  var edtime = addMinutes(new Date(), notificationRemainderTime/(1000*60));
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
      connection.close();
    }
    else
    {

      var pushInfo = [];
      for (var i = 0; i < invites.length; i++) {
         
        pushInfo["Subject"] = invites[i].Subject;
        pushInfo["Agenda"] = invites[i].Agenda;

          // Invitations_ids.push(invites[i]._id);
          Invitees.find({Invitations_id: invites[i]._id}).toArray( function(error, invitees) {
            if(error)
            {
              utility.log("find Invitees error: " + error, 'ERROR');
              connection.close();
            }
            else
            {
              
              for (var j = 0; j < invitees.length; j++) {
                
                pushInfo["UserID"] = invitees[j].UserID;

                Registrations.findOne({UserID: invitees[j].UserID.trim()}, function(error, registrations) {
                  if(error)
                  {
                    utility.log("find registration error: " + error, 'ERROR');
                    connection.close();
                  }
                  else
                  {
                    // console.log("Inv ID: "+invites[i]._id);
                    // console.log(invitees[j]);
                    // console.log(registrations);
                    if(registrations != null)
                    {
                      pushInfo["PushUrl"] = registrations.Handle;
                      var tileObj = {
                                'title': pushInfo["Subject"],
                                'backTitle': "Next Conference",
                                'backBackgroundImage': "/Assets/Tiles/BackTileBackground.png",
                                'backContent': pushInfo["Agenda"]
                                };
                    mpns.sendTile(pushInfo["PushUrl"], tileObj, function(){utility.log('Pushed to ' + pushInfo["UserID"]);});
                    connection.close();
                    } 
                    // else {
                    //   pushInfo["PushUrl"] =null;
                    //   utility.log("Can't find push URL for "+pushInfo["UserID"]+" . so can't push notification.",'WARNING');
                    // }
                    // console.log(pushInfo);

                  }
                });
              }
            }
          });
          
        }
        
        //return JSON.stringify(result);
        // response.setHeader("content-type", "text/plain");
        // response.write("{\"Tolls\":" + JSON.stringify(result.Toll) + "}");
        // response.end();
      }

    });



});

}






/// Exposes all methods to call outsite this file, using its object   
exports.insertInvitationEntity=insertInvitationEntity;
exports.PushNotification=PushNotification
