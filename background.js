/*function onInstall() {
    console.log("Extension Installed");
  }

  function onUpdate() {
    console.log("Extension Updated");
  }

  function getVersion() {
    var details = chrome.app.getDetails();
    return details.version;
  }

  // Check if the version has changed.
  var currVersion = getVersion();
  var prevVersion = localStorage['version']
  if (currVersion != prevVersion) {
    // Check if we just installed this extension.
    if (typeof prevVersion == 'undefined') {
      onInstall();
    } else {
      onUpdate();
    }
    localStorage['version'] = currVersion;
  }*/
function install_notice() {
    if (localStorage.getItem('install_time'))
        return;

    var now = new Date().getTime();
    localStorage.setItem('install_time', now);
    chrome.tabs.create({url: "welcome.html"});
}
install_notice();
/*
to make sure queue have videos in the order they are queued. we need to have lock, because youtube api have random response time.
sould find a better way to do it.
*/
var lock=false;
var tries=0;

//pollPrimaryTab();
function Queue(){
	this.videos=[];
	this.currentIndex=-1;
	this.repeatOn=false;
}

Queue.prototype.reset = function() {
	this.videos=[];
	this.currentIndex=-1;
};

Queue.prototype.size = function() {
	return this.videos.length;
};

Queue.prototype.getVideos = function() {
	return this.videos;
};

Queue.prototype.getVideo = function(index) {
	return this.videos[index];
};

Queue.prototype.getCurrentIndex = function() {
	return this.currentIndex;
};

Queue.prototype.setCurrentIndex = function(index) {
	return this.currentIndex=index;
};

Queue.prototype.getCurrentVideo = function() {
	return this.getVideo(this.getCurrentIndex());
};

Queue.prototype.getNextVideo = function() {
	if(this.hasNext()) {
		this.currentIndex++;
		return this.getCurrentVideo();
	}
};

Queue.prototype.getPreviousVideo = function() {
	if(this.hasPrevious()) {
		this.currentIndex--;
		return this.getCurrentVideo();
	}
};

Queue.prototype.hasNext = function() {
	return this.getCurrentIndex()+1<=this.size()-1;
};

Queue.prototype.hasPrevious = function() {
	return this.getCurrentIndex()-1>=0;
};

Queue.prototype.addVideo = function(video) {
	return this.videos.push(video);
};

Queue.prototype.deleteVideo = function(id) {
	for (var i = 0; i < this.size(); i++) {
		if(this.videos[i].id==id) {
			this.videos.splice(i,1);
			break;
		}
	}
};

Queue.prototype.getVideoIndex = function(id) {
	for (var i = 0; i < this.size(); i++) {
		if(this.videos[i].id==id) {
			return i;
		}
	}
	return -1;
};

Queue.prototype.hasVideo = function(id) {
	for (var i = 0; i < this.size(); i++) {
		if(this.videos[i].id==id) {
			return true;
		}
	}
	return false;
};

Queue.prototype.shuffle = function() {
	this.videos = shuffle(this.videos);
};

Queue.prototype.setRepeatOn = function() {
	return this.repeatOn=true;
};

Queue.prototype.isRepeat = function() {
	return this.repeatOn;
};

function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

console.log("extension started");
var ytTabs = [];
var queue = new Queue();
var primaryTabId;

function getVideoIdFromUrl(url){
	var r = queryObj(url);
	return r["v"];
}

function queryObj(url) {
    var result = {}, keyValuePairs = ((url.split('?'))[1].split('#'))[0].split('&');

    keyValuePairs.forEach(function(keyValuePair) {
        keyValuePair = keyValuePair.split('=');
        result[keyValuePair[0]] = keyValuePair[1] || '';
    });

    return result;
}

function isVideoPage(url){
	try{
		var r = queryObj(url);
		return !(r["v"]==undefined);	
	}catch(e){return false;}
}

chrome.runtime.onMessage.addListener(function(msg,sender,sendResponse) {
	if(msg.type=="registerTab"){
		//console.log(sender.tab);
		registerTab(sender.tab.id);		
	} else if(msg.type=="createTab"){
		createTab(msg.url);
	} else if(msg.type=="addVideo"){
		console.log("received request to add video");
		handleVideoAdd(msg.video_id,sender.tab);
		//console.log("video added");
	} else if(msg.type=="removeVideo"){
		console.log("received request to remove video");
		removeVideoFromQueue(msg.video_id);
		//console.log("video removed");
	} else if(msg.type=="getQueue"){
		//console.log("received request to get queue");
		sendResponse({"data":queue});
	} else if(msg.type=="playAll"){
		console.log("received request to playAll");
		handlePlayAll(sender.tab);
	} else {
		console.log("unknown msg type received ");
	}
});


function handlePlayAll(senderTab){
	if(primaryTabId==undefined){
		sendLoadQueue(senderTab);
	} else{
		chrome.tabs.get(primaryTabId, function (tab){
			if(tab==undefined){
				sendLoadQueue(senderTab);
			} else if(tab.status=="loading"){
				setTimeout(function(){handlePlayAll(senderTab)},1000);
				return;
			} else{
					var msg={"type":"status"};
					chrome.tabs.sendMessage(primaryTabId,msg, function(res){
						if(res==undefined || !res.status){
							sendLoadQueue(senderTab);
						} else {
							setTabFocus(senderTab);
						}
						
					});
				}
		});
	} 
}

function sendLoadQueue(tab){
	setPrimaryTab(tab.id);
	chrome.tabs.sendMessage(primaryTabId,{type:"loadQueue"}, function(res){});
}

function setTabFocus(tab){

}

function registerTab(id){
	if(hasKey(ytTabs,id)) return;
	ytTabs.push(id);	
	//console.log("current tabs with youtube videos");
	//console.log(ytTabs);
}

function removeFromArray(array, ele){
	var index = array.indexOf(ele);	
	if(index>-1) array.splice(index,1);
}

function hasKey(array, key){
	return array.indexOf(key)>-1;
}

function addVideoToQueue(videoId,tabId){
	if(queue.hasVideo(videoId)) return;
	if(lock) {
		console.log('inside lock');
		setTimeout(function() {addVideoToQueue(videoId,tabId)},1000);
		return;
	}
	
	lock=true;

	//console.log("tab playing the queue "+primaryTabId);
	//console.log("tabs with youtube video open");
	//console.log(ytTabs);
	//console.log("current queue");
	//console.log(queue);
	console.log('querying for video_id: '+videoId);
	try{
		var x = new XMLHttpRequest();
		x.open("GET","http://gdata.youtube.com/feeds/api/videos/"+videoId+"?v=2&alt=jsonc",true);
		x.onreadystatechange = function(){
			if (x.readyState == 4) {
				if(x.status == 200) {
					var video =JSON.parse(x.responseText).data;
					queue.addVideo(video);
					console.log("queue after adding video");
					console.log(queue);

					if(primaryTabId==undefined) setPrimaryTab(tabId);
					var msg={"type":"videoAdded","queue":queue,"video":video};
					if(primaryTabId!=undefined) {
						chrome.tabs.sendMessage(primaryTabId,msg, function(res){});	
					}
					
				}
				lock=false;
			}
		};
		x.send();
	}catch(e){
		lock=false;
	}
}

var insertVideo = function (info) {
	queue.addVideo(info.data);
	//console.log("queue after adding video");
	//console.log(queue);
	if(primaryTabId==undefined) setPrimaryTab(tabId);
};


function removeVideoFromQueue(id){

	//console.log("tab playing the queue"+primaryTabId);
	//console.log("tabs with youtube video open");
	//console.log(ytTabs);
	//console.log("cuurent queue");
	//console.log(queue);

	queue.deleteVideo(id);
	if(primaryTabId!=undefined){
		var msg={"type":"videoDeleted","queue":queue,"video_id":id};
			chrome.tabs.sendMessage(primaryTabId,msg, function(res){
					
			});	
	}
	//console.log("queue after removing video");
	//console.log(queue);
}

function setPrimaryTab(id){
	//console.log("setting primary tab to : "+id);
	primaryTabId=id;
	if (queue.size()>0 && queue.getCurrentIndex()==-1) {
		//console.log("setting current to 0");
		queue.setCurrentIndex(0);
	};
}


function pollPrimaryTab(){
	if(primaryTabId!=undefined && primaryTabId!=null){
		chrome.tabs.get(primaryTabId, function (tab){
			//console.log(tab);
			if(tab!=undefined){
			 	if(tab.status!="loading"){
					//console.log("not loading")
					var msg={"type":"status"};
					chrome.tabs.sendMessage(primaryTabId,msg, function(res){
						//console.log('response')
						//console.log(res);
						//console.log("tries: "+tries);
						if((res==undefined || !res.status)){
							if(tries==1){
								reset();
							} else{
								tries++;
							}
						} else{
							tries=0;
						}
					});
				}
			} else{
				//console.log("undefined tab")
				if(tries==1){
					reset();
				} else{
					tries++;
				}
			}
			
		});
	}
	setTimeout(pollPrimaryTab,10000);
}

function reset(){
	tries=0;
	//console.log("reseting queue");
	primaryTabId=undefined;
	queue.reset();
}

function getPrimaryTabStatus(){

}

var contextMenuAddProp={
	title:"Add to Queue",
	targetUrlPatterns: ['*://*.youtube.com/watch?*'],
	contexts: ['link'],
	'onclick': function (onClickData,tab) {
        var url = onClickData.linkUrl;
		var videoId = getVideoIdFromUrl(url);
		handleVideoAdd(videoId,tab);
	}
};
var contextMenuRemProp={
	title:"Remove from Queue",
	targetUrlPatterns: ['*://*.youtube.com/watch?*'],
	contexts: ['link'],
	'onclick': function (onClickData) {
        var url = onClickData.linkUrl;
		var videoId = getVideoIdFromUrl(url);
		//console.log("Video to be removed from right click menu: "+videoId);
		removeVideoFromQueue(videoId);
	}
};

chrome.contextMenus.create(contextMenuAddProp, function(){

});

chrome.contextMenus.create(contextMenuRemProp, function(){

});

chrome.commands.onCommand.addListener(function(command) {
    //console.log('Command:', command);
    if(primaryTabId==undefined) return;
    if(command=='play-pause-video'){
    	var msg={"type":"toggle"};
    } else if (command=='play-next-video') {
    	var msg = {"type":"next"};
    } else if(command=='play-previous-video') {
    	var msg = {"type":"previous"};
    } else {
    	console.log('unknown command');
    	return;
    }
    chrome.tabs.sendMessage(primaryTabId,msg, function(res){});
});


function createTab(url){
	try{
		chrome.tabs.create({url:url});
	}catch(e){
		console.log(e);
	}
}


function handleVideoAdd(videoId,videoTab){

	console.log("Video to be added from right click menu: "+videoId);
	if(primaryTabId!=undefined){
		chrome.tabs.get(primaryTabId, function (tab){
			//console.log(tab);
			if(tab==undefined){
				reset();
				doAdd(videoId,videoTab);
			} else if(tab.status=="loading"){
				setTimeout(function(){handleVideoAdd(videoId,videoTab)},2000);
				return;
			} else{
					//console.log("not loading");
					var msg={"type":"status"};
					chrome.tabs.sendMessage(primaryTabId,msg, function(res){
						if(res==undefined || !res.status){
							reset();
						}
						doAdd(videoId,videoTab);
					});
				}
		});
	} else {
		doAdd(videoId,videoTab);
	}
}

function doAdd(videoId,videoTab){
	if(primaryTabId==undefined){
		if(isVideoPage(videoTab.url)){
			addVideoToQueue(getVideoIdFromUrl(videoTab.url),videoTab.id);
			addVideoToQueue(videoId,videoTab.id);
		} else{
			addVideoToQueue(videoId,undefined);
			chrome.tabs.create({url:"http://youtube.com/watch?v="+videoId+"&qq=1"}, function(tab){
				setPrimaryTab(tab.id);
			});
		}
	} else{
		addVideoToQueue(videoId,undefined);
	}
}
