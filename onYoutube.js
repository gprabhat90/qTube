var Prop = {
	"ADD_TO_QUEUE":"Add To Queue",
	"REMOVE_FROM_QUEUE":"Added",
	"ADD_TO_QUEUE_ICON_URL":chrome.extension.getURL("icon.png"),
	"REMOVE_FROM_QUEUE_ICON_URL":chrome.extension.getURL("right.png"),
	"ADD_TO_QUEUE_INSERT_POLL_TIME":2000,
	"ADD_TO_QUEUE_TITLE":"Add to Queue",
	"REMOVE_FROM_QUEUE_TITLE":"Remove from Queue",
	"WELCOME_PAGE":chrome.extension.getURL("welcome.html")
}

var Player = {
	"HTML5":"HTML5",
	"FLASH":"FLASH"
};

var currentPlayer;

outerPoll();
var mv;
var currentQueue;

function Queue(obj){
	this.videos=obj.videos;
	this.repeatOn=obj.repeatOn;
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
Queue.prototype.setVideos = function(v) {
	return this.videos=v;
};

Queue.prototype.getVideo = function(index) {
	return this.videos[index];
};

Queue.prototype.getNextVideoFrom =function(video_id){
	if(this.size()<=0) return undefined;
	var index = this.getVideoIndex(video_id);
	if(this.getVideo(index+1)!=undefined) return this.getVideo(index+1);
	else return this.getVideo(0);
} 

Queue.prototype.getPreviousVideoFrom =function(video_id){
	if(this.size()<=0) return undefined;
	var index = this.getVideoIndex(video_id);
	if(this.getVideo(index-1)!=undefined) return this.getVideo(index-1);
	else return this.getVideo(this.size()-1);
} 

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

Queue.prototype.hasVideo = function(id) {
	for (var i = 0; i < this.size(); i++) {
		if(this.videos[i].id==id) {
			return true;
		}
	}
	return false;
};

Queue.prototype.getVideoIndex = function(id) {
	for (var i = 0; i < this.size(); i++) {
		if(this.videos[i].id==id) {
			return i;
		}
	}
	return -1;
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

var videoStatus = {
	"QUEUED":1,
	"NOT_QUEUED":0
}

function outerPoll(){
	if(isVideoPage()){
			//console.log("A video Page: running script");	
			runScript();
	} else{
		//console.log("Not a video Page");
		setTimeout(outerPoll,1000);
	}	
}

function isVideoPage(){
	var r = queryObj();
	return !(r["v"]==undefined);	
}

//only to be run if it is a video page
function runScript(){
	registerTab();	
	currentQueuePoll();
	//poll();
	registerMsgListener();
	insertAddToQueueOptionOnVideos();
	load(false);
}

function currentQueuePoll(){
	if(currentQueue==undefined){
		getCurrentQueue();
	} else{
		var msg={"type":"getQueue"};
		try{
			chrome.runtime.sendMessage(msg,function(response){
				currentQueue.setVideos(response.data.videos);
			});
		}catch(e){
			console.log(e);
		}
	}
	setTimeout(currentQueuePoll,2000);
}

function registerTab(){
	console.log("calling background to register tab");
	var msg = {"type":"registerTab","data":null};
	chrome.runtime.sendMessage(msg);
}

function registerMsgListener(){
	chrome.runtime.onMessage.addListener(function(msg,sender,sendResponse) {
		if(msg.type=="toggle"){
			//console.log("received request to pause");
			toggleVideo();
		} else if(msg.type=="next"){
			//console.log("received request for ### play next video ####");
			loadNextVideo();
		} else if(msg.type=="previous"){
			//console.log("received request for ### play [previous] video ####");
			loadPreviousVideo();
		} else if(msg.type=="videoAdded"){
			try{
				currentQueue.setVideos(msg.queue.videos);
				console.log("received request to add a video ####");
				addVideoToSkin(msg.video,currentQueue.getVideoIndex(msg.video.id));
			}catch(e){
				console.log(e);
			}
		} else if(msg.type=="videoDeleted"){
			try{
				var reload = false; var nextVid="";
				console.log(currentQueue.getCurrentVideo());
				if(getVideoIdFromUrl()==msg.video_id){
					reload=true;
					nextVid=currentQueue.getNextVideoFrom(msg.video_id).id;
				}
				currentQueue.setVideos(msg.queue.videos);
				console.log("received request to delete a video ####");
				deleteVideoFromSkin(msg.video_id);
				if(reload) reloadTab(nextVid);
			}catch(e){
				console.log(e);
			}

		} else if(msg.type=="status"){
			sendResponse({"status":getStatus()});
		} else {
			console.log("unknown msg type received ");
		}
	});
}

function getStatus(){
	var skin = document.getElementById('watch-appbar-playlist'); //have to change this to our own id
	return skin!=undefined;
}

function poll(){
	//console.log('polling');
	var v = document.getElementById('addToQueue');
	insertAddToQueueOption();
	setTimeout(poll,1000);
}

function registerAddQueueListener(){
	var text = document.getElementById('addToQueueText');
	var icon = document.getElementById('queue-icon');
	var a = document.getElementById('addToQueue');
	if(a!=undefined && a!=null){
		a.onclick = function(){
			if(text.innerText===Prop.ADD_TO_QUEUE){
				addVideoToQueue(getVideoIdFromUrl());
				text.innerText=Prop.REMOVE_FROM_QUEUE;
				icon.src=Prop.REMOVE_FROM_QUEUE_ICON_URL;			
			} else {
				removeVideoFromQueue(getVideoIdFromUrl());
				text.innerText=Prop.ADD_TO_QUEUE;
				icon.src=Prop.ADD_TO_QUEUE_ICON_URL;			
			}
		}
	}
}

function addVideoToQueue(video_id){
	var msg = {"type":"addVideo","video_id":video_id};
	sendMsgTobg(msg);
}

function removeVideoFromQueue(video_id){
	var msg = {"type":"removeVideo","video_id":video_id};
	sendMsgTobg(msg);
}

function sendMsgTobg(msg){
	chrome.runtime.sendMessage(msg);
}

function insertAddToQueueOption(){
	try{
		
		var text="",src="";
		if(currentQueue.hasVideo(getVideoIdFromUrl())) {
			text = Prop.REMOVE_FROM_QUEUE;
			src = Prop.REMOVE_FROM_QUEUE_ICON_URL;
		}
		else {
			text = Prop.ADD_TO_QUEUE;
			src = Prop.ADD_TO_QUEUE_ICON_URL;
		}
		//console.log('adding Queue option');
		var span=document.getElementById('addToQueue');
		if(span==undefined){
			span = document.createElement('span');
			span.id='addToQueue';
			span.style="margin-left:10px; cursor:pointer;";
			span.className="yt-uix-button yt-uix-button-text yt-uix-button-size-default yt-uix-button-has-icon yt-uix-tooltip yt-uix-button-empty";
			span.innerHTML = '<span class="yt-uix-button-icon" style="width: 20px; height: 23px; margin-right: 3px; "><label style="position: absolute; bottom: 2px; right: 0px; font-size: 11px; display: none;"></label><img id="queue-icon" style="width: 20px; height: 23px;" src="https://storage.googleapis.com/support-kms-prod/SNP_8F339B792FAC26B3EA3509763CD37F5F6CA8_3269178_en_v0"></img></span>';
			var span2 = document.createElement('span');
			span2.id='addToQueueText';
			span.appendChild(span2);	
			var a = document.getElementById('watch7-sentiment-actions'); //TODO what if they change this
			if(a==undefined) return;
			a.appendChild(span);	
		}
		
		var span2 = document.getElementById('addToQueueText');
		if(span2.innerHTML!=text){
			span2.innerHTML=text;
			var queueIcon = document.getElementById('queue-icon');
			if(queueIcon!=undefined) queueIcon.src=src;
		}
		registerAddQueueListener();
	} catch(e){
		//console.log(e);
	}		
}

function hasKey(array, key){
	return array.indexOf(key)>-1;
}

function getVideoIdFromUrl(){
	var r = queryObj();
	return r["v"];
}

function queryObj() {
    var result = {}, keyValuePairs = location.search.slice(1).split('&');

    keyValuePairs.forEach(function(keyValuePair) {
        keyValuePair = keyValuePair.split('=');
        result[keyValuePair[0]] = keyValuePair[1] || '';
    });

    return result;
}

function getCurrentQueue(){
	try{ 
		var msg={"type":"getQueue"};
		chrome.runtime.sendMessage(msg,function(response){
			setCurrentQueue(response.data);
			//console.log(currentQueue);
		});
	}catch(e){
		console.log(e);
	}
}

function setCurrentQueue(queue){
	currentQueue = new Queue(queue);
}

function insertAddToQueueOptionOnVideos(){
	if(currentQueue==undefined){
		//console.log('undefined currentQueue');
		getCurrentQueue();
		setTimeout(insertAddToQueueOptionOnVideos,Prop.ADD_TO_QUEUE_INSERT_POLL_TIME);
		return;
	}
	
	insertAddToQueueOption();
	var items = document.getElementsByClassName('video-list-item');
	for(var i=0;i<items.length; i++){
		try{
			var item = items[i];
			var q = item.getElementsByClassName('addto-queue-button')[0];
			if(q==undefined || q==null){
				
				var span=item.getElementsByClassName('yt-uix-simple-thumb-wrap')[0]; 
				var but=item.getElementsByTagName('button')[0]; 
				q=but.cloneNode();
				q.classList.remove('addto-watch-later-button');
				q.classList.add('addto-queue-button');
				q.style.marginBottom="22px";
				q.style.padding="0px";
				q.style.width="22px";
				q.style.height="22px";
				q.innerHTML='<img width="20px" height="20px" src=""></img>';
			}
			q.setAttribute('status',getVideoStatus(q.getAttribute('data-video-ids')));

			if(q.getAttribute('status')==videoStatus.QUEUED){
				q.getElementsByTagName('img')[0].src=Prop.REMOVE_FROM_QUEUE_ICON_URL;
				q.title=Prop.REMOVE_FROM_QUEUE_TITLE;
				q.setAttribute('data-tooltip-text',Prop.REMOVE_FROM_QUEUE_TITLE);
			} else {
				q.getElementsByTagName('img')[0].src=Prop.ADD_TO_QUEUE_ICON_URL;
				q.title=Prop.ADD_TO_QUEUE_TITLE;
				q.setAttribute('data-tooltip-text',Prop.ADD_TO_QUEUE_TITLE);
			}
					
			q.onclick=function(){
				console.log('video to be added/removed: '+this.getAttribute('data-video-ids'));
				if(this.getAttribute('status')==videoStatus.QUEUED){
					removeVideoFromQueue(this.getAttribute('data-video-ids'));
					this.innerHTML='<img  width="20px" height="20px" src="'+Prop.ADD_TO_QUEUE_ICON_URL+'"></img>';
					this.title=Prop.ADD_TO_QUEUE_TITLE;
					this.setAttribute('data-tooltip-text',Prop.ADD_TO_QUEUE_TITLE);
					this.setAttribute('status',videoStatus.NOT_QUEUED);
				} else {
					if(currentQueue.size()==0) {
						load(true);
						addVideoToQueue(getVideoIdFromUrl());
					}
					addVideoToQueue(this.getAttribute('data-video-ids'));
					this.innerHTML='<img width="20px" height="20px" src="'+Prop.REMOVE_FROM_QUEUE_ICON_URL+'"></img>';
					this.title=Prop.REMOVE_FROM_QUEUE_TITLE;
					this.setAttribute('data-tooltip-text',Prop.REMOVE_FROM_QUEUE_TITLE);
					this.setAttribute('status',videoStatus.QUEUED);
				}
				return false;
			}
			span.appendChild(q);
		} catch(e){
			//console.log(e);
		}
	}
	setTimeout(insertAddToQueueOptionOnVideos,Prop.ADD_TO_QUEUE_INSERT_POLL_TIME);
}

function getVideoStatus(video_id){
	if(currentQueue.hasVideo(video_id)) return videoStatus.QUEUED;
	return videoStatus.NOT_QUEUED;
}

function getThumb(video_id){
	var img = document.createElement('img')
	img.src="//i1.ytimg.com/vi/"+video_id+"/default.jpg"
	img.setAttribute('data-thumb',"//i1.ytimg.com/vi/"+video_id+"/default.jpg")
	img.alt="Thumbnail"
	img.width="64"
	var span = document.createElement('span')
	span.className="yt-thumb-clip"
	span.appendChild(img)
	var s2 = document.createElement('span')
	span.appendChild(s2)
	s2.className="vertical-align"
	var s3 = document.createElement('span')
	s3.className="yt-thumb-default"
	s3.appendChild(span)
	var s4 = document.createElement('span')
	s4.className="video-thumb yt-thumb yt-thumb-64"
	s4.appendChild(s3)
	return s4;
}

function getVideoDescription(video_title,user){
	var div = document.createElement('div')
	div.className="playlist-video-description"
	var h4 = document.createElement('h4')
	h4.className="yt-ui-ellipsis yt-ui-ellipsis-2"
	var span = document.createElement('span')
	span.className="yt-ui-ellipsis-wrapper"
	span.setAttribute('data-original-html',video_title)
	span.innerHTML=video_title
	h4.appendChild(span)
	span = document.createElement('span')
	span.className='video-uploader-byline'
	span.innerHTML='by '+user
	div.appendChild(h4)
	div.appendChild(span)
	return div;
}

function getRemoveButton(video_id){
	var b = document.createElement('button')
	var i = document.createElement('img')
	i.className='yt-uix-button-icon yt-uix-button-icon-playlist-remove-item'
	i.src='https://s.ytimg.com/ytss/img/pixel-vfl3z5WfW.gif'
	i.alt="Remove from Queue"
	var span = document.createElement('span')
	span.className='yt-uix-button-icon-wrapper'
	span.appendChild(i)
	b.appendChild(span)
	b.title='Remove From Queue'
	b.type='button'
	b.className='yt-uix-button-playlist-remove-item spf-nolink yt-uix-button yt-uix-button-player-controls yt-uix-button-size-default yt-uix-button-has-icon yt-uix-tooltip yt-uix-button-empty'
	b.setAttribute('video-id',video_id)
	b.onclick= function(){
		console.log('delete pressed')
		removeVideoFromQueue(b.getAttribute('video-id'));
		return false;
	}
	return b;
}

function getVideoLink(video_id,video_index,video_title,user){
	var a = document.createElement('a')
	a.href="/watch?v="+video_id+'&qq=1';
	a.className="playlist-video clearfix spf-link"
	a.appendChild(getRemoveButton(video_id))
	a.appendChild(getThumb(video_id))
	a.appendChild(getVideoDescription(video_title,user))
	return a;
}

function getVideoItem(video_id,video_title,user,video_index){
	var li = document.createElement('li')
	li.className='yt-uix-scroller-scroll-unit  '
	if(video_index==currentQueue.getCurrentIndex()){
		li.classList.add('currently-playing')
	}
	li.setAttribute('data-index',video_index)
	li.setAttribute('data-video-id',video_id)
	li.setAttribute('data-video-clip-start','None')
	li.setAttribute('data-video-clip-end','None')
	li.setAttribute('data-video-title',video_title)
	li.setAttribute('data-video-username',user)
	var span = document.createElement('span')
	span.className='video-index'
	//span.innerHTML=video_index+1
	li.appendChild(span)
	li.appendChild(getVideoLink(video_id,video_index,video_title,user));
	return li;
}

function getListElement(){
	var ol = document.createElement('ol')
	ol.id="videos-list";
	ol.className="playlist-videos-list yt-uix-scroller"
	ol.setAttribute('data-scroll-action',"yt.www.watch.lists.loadThumbnails")
	ol.setAttribute('data-scroller-offset',"0")
	ol.setAttribute('data-scroller-mousewheel-listener',"")
	ol.setAttribute('data-scroller-scroll-listener',"")
	return ol;
}

function getQueueVideosContainer(){
	var div = document.createElement('div')
	div.className="playlist-videos-container yt-scrollbar-dark yt-scrollbar"
	var list = getListElement();
	div.appendChild(list);
	return div;
}

function getQueueInfo(){
	var div = document.createElement('div')
	div.className="playlist-info"
	div.setAttribute('data-list-title',"Queue")
	div.setAttribute('data-list-author',"")

	div.innerHTML='<h3 class="playlist-title"><a href="#" class="spf-link"> Current Stream </a></h3><span class="author-attribution"> by <a id="qtube-welcome" href="#" class="yt-uix-sessionlink yt-user-name spf-link" dir="ltr">qTube</a> </span>';
    return div;
}

function getPreviousButton(){
	try{
		var a= document.createElement('a')
		var index = currentQueue.getCurrentIndex();
		if(currentQueue.hasPrevious()) index--;
		else index=currentQueue.size()-1;
		a.href='#';
		a.className="yt-uix-button  prev-playlist-list-item yt-uix-tooltip yt-uix-tooltip-masked spf-link yt-uix-button-player-controls yt-uix-button-size-default yt-uix-button-empty"
		a.title="Previous video"
		a.innerHTML='<span class="yt-uix-button-icon-wrapper"><img class="yt-uix-button-icon yt-uix-button-icon-watch-appbar-play-prev" src="https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif" alt="" title=""></span>';
		return a;
	}catch(e){
		console.log(e);
	}
}
function getNextButton(){
	try{
		var a= document.createElement('a')
		var index = currentQueue.getCurrentIndex();
		//console.log(currentQueue)
		if(currentQueue.hasNext()) {
			index++;
		}
		else {
			//console.log('returned value of hasNext:'+currentQueue.hasNext())
			index=0;
		}
		a.href='#';
		a.className="yt-uix-button  next-playlist-list-item yt-uix-tooltip spf-link yt-uix-button-player-controls yt-uix-button-size-default yt-uix-button-empty"
		a.title="Next video"
		a.innerHTML='<span class="yt-uix-button-icon-wrapper"><img class="yt-uix-button-icon yt-uix-button-icon-watch-appbar-play-next" src="https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif" alt="" title=""></span>';
		return a;
	}catch(e){
		console.log(e);
	}
}
function getControlBars(){
	var div = document.createElement('div')
	div.className='playlist-behavior-controls'
	div.appendChild(getPreviousButton())
	div.appendChild(getNextButton())

	var div2 = document.createElement('div')
	div2.className="control-bar clearfix"
	div2.appendChild(div);
	return div2;
}

function getQueueSkin(){
	var div = document.createElement('div')
	div.id="watch-appbar-playlist"

	var div2 = document.createElement('div')
	div2.className="main-content"

	var div3 =document.createElement('div')
	div3.className="playlist-header" 
	

	var div4 =document.createElement('div')
	div4.className="playlist-header-content"
	var img = document.createElement('img')
	img.src="https://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif";
	img.className="playlist-mix-icon";
	div4.appendChild(img);
	div4.appendChild(getQueueInfo())
	
	div3.appendChild(div4);
	div3.appendChild(getControlBars())
	div2.appendChild(div3)
	div2.appendChild(getQueueVideosContainer())

	div.appendChild(div2)
	return div;
}

function insertQueueSkin(){
	var a= document.getElementById('watch7-sidebar')
	var skin = getQueueSkin();
	a.insertBefore(skin,a.firstElementChild);
	return skin;
}

function load(force){
	var params= queryObj();
	if((params['qq']==undefined || params['qq']==0)&&!force){
		console.log('not to load the queue');
		console.log('value of qq is: '+params['qq']);
		return;
	} 
	if(currentQueue==undefined){
		console.log('current queue is undefined, will try in 1 sec');
		getCurrentQueue();
		setTimeout(function(){load(force);},1000);
		return;
	}
	if(currentQueue.size()<=0) return;
	var skin = document.getElementById('watch-appbar-playlist');
	if(skin!=null || skin!= undefined) return;
	
	//do not need index
	//var index=params['vi'];
	var index=currentQueue.getVideoIndex(getVideoIdFromUrl());

	if(index==undefined) index=0;
	currentQueue.setCurrentIndex(parseInt(index));
	insertQueueSkin();
	insertWelcomePageUrl();
	for (var i = 0; i < currentQueue.size(); i++) {
		var video = currentQueue.getVideo(i);
		addVideoToSkin(video,i)
	};
	setTimeout(registerAutoPlay,5000)
	//console.log(mv);
	skinPoll();
}

function skinPoll(){
	var params= queryObj();
	var skin = document.getElementById('watch-appbar-playlist');
	if(params['qq']==1 && (skin==undefined|| skin==null)){
		load(false);
	} else{
		setTimeout(skinPoll,100);
	}
}

function addVideoToSkin(video,index){
	var skin = document.getElementById('watch-appbar-playlist');
	if(skin==undefined || skin==null){
		load(true);
		return;
	}
	var list= skin.getElementsByTagName('ol')[0];
	list.appendChild(getVideoItem(video.id,video.title,video.uploader,index))
	refresh();
}
 
function deleteVideoFromSkin(video_id){
	var skin = document.getElementById('watch-appbar-playlist');
	if(skin==undefined || skin==null) return;
	var list= skin.getElementsByTagName('ol')[0];
	var c= list.childNodes;
	for(var i=0; i<c.length; i++){
		if(c[i].getAttribute('data-video-id')==video_id){
			list.removeChild(c[i])
			break;
		}
	}
	refresh();
}

function refreshNextButton(){
	try{
		var controls = document.getElementsByClassName('playlist-behavior-controls')[0];
		var a =controls.getElementsByTagName('a')[1];
		/*var index = currentQueue.getCurrentIndex();
		if(currentQueue.hasNext()) index++;
		else index=0;*/
		a.href='https://www.youtube.com/watch?v='+currentQueue.getNextVideoFrom(getVideoIdFromUrl()).id+'&qq=1';
	}catch(e){
		console.log(e);
	}
}

function refreshPreviousButton(){
	try{
		var controls = document.getElementsByClassName('playlist-behavior-controls')[0];
		var a =controls.getElementsByTagName('a')[0];
		/*var index = currentQueue.getCurrentIndex();
		if(currentQueue.hasPrevious()) index--;
		else index=currentQueue.size()-1;*/
		a.href='https://www.youtube.com/watch?v='+currentQueue.getPreviousVideoFrom(getVideoIdFromUrl()).id+'&qq=1';
	}catch(e){
		console.log(e);
	}
}

function refreshIndexes(){
	var skin = document.getElementById('watch-appbar-playlist');
	if(skin==undefined || skin==null) return;
	var idx = skin.getElementsByClassName('video-index');
	for (var i = 0; i < idx.length; i++) {
		idx[i].innerHTML=i+1;
	};
}

function refresh(){
	console.log('refreshing');
	refreshNextButton();
	refreshPreviousButton();
	//refreshIndexes();
}

injectScript = function(newState) {
	var b= document.getElementsByTagName('body')[0]
	var s= document.createElement('script');
	//s.innerHTML='function aaa(){var mv=  document.getElementById("movie_player");getPlayerState mv.addEventListener("onStateChange", "myplayerstateChnage"); setTimeout(aaa,20000);} aaa(); myplayerstateChnage = function(newState) {console.log("Player\'s new state: " + newState);}'
	s.innerHTML='myplayerstateChnage = function(newState) {if(newState==0) loadNextVideo();}; function loadNextVideo(){ var a =document.getElementsByClassName(\'playlist-behavior-controls\')[0]; var next= a.getElementsByTagName(\'a\')[1]; next.click();} '
	b.appendChild(s);
}

function registerAutoPlay(){
	//console.log('registering auto play');
	mv = document.getElementsByTagName('video')
	if(mv.length>0) {
		mv=mv[0];
		if(mv==undefined || mv==null) {
			//console.log('undefined movie player');
			return;
		}
		//console.log('html5 player found');
		player = Player.HTML5;
		mv.onended=function aaa(){
			console.log('video ended### starting next');
			loadNextVideo();
		}
	}
	else {
		mv = document.getElementById('movie_player')
		if(mv==undefined || mv==null) {
			//console.log('undefined movie player');
			return;
		}
		//console.log('flash player found');
		player=Player.FLASH;
		mv.addEventListener("onStateChange", "myplayerstateChnage");
		injectScript();
		//console.log('event registerd')
	}
	setTimeout(registerAutoPlay,20000)
}


function loadNextVideo(){
	var a =document.getElementsByClassName('playlist-behavior-controls')[0];
	var next= a.getElementsByTagName('a')[1];	
	/*var msg = {"type":"noti","link":next};
	sendMsgTobg(msg);*/
	next.click();
}

function loadPreviousVideo(){
	var a =document.getElementsByClassName('playlist-behavior-controls')[0];
	var next= a.getElementsByTagName('a')[0];	
	/*var msg = {"type":"noti","link":next};
	sendMsgTobg(msg);*/
	next.click();
}

function toggleVideo(){
	try{
		if(player==undefined || player==null) return;
		if(player==Player.HTML5){
			if(mv.paused) mv.play();
			else mv.pause();
		} else if(player==Player.FLASH){
			if(mv.getPlayerState()==2) playVideo();
			else pauseVideo();
		}
	}catch(e){
		console.log(e);
	}
}

function playVideo(){
	try{
		mv.playVideo();
	}catch(e){
		console.log(e);
		console.log(mv);
	}
}
function pauseVideo(){
	try{
		mv.pauseVideo();
	}catch(e){
		console.log(e);
	}
}

function reloadTab(video_id){
	console.log("Reloading this tab");
	window.location.href='https://www.youtube.com/watch?v='+video_id+'&qq=1';
}

function insertWelcomePageUrl(){
	try{
    	document.getElementById('qtube-welcome').onclick = function(){
    		var msg = {"type":"showWelcome"};
			sendMsgTobg(msg);
    	}
    } catch(e){
    	console.log(e);
    }
}
