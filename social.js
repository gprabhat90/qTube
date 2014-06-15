function showTab (id) {
	document.getElementById(id).style.display='block';
}


function hideAllTab(){
	var tabs = document.getElementsByClassName('content');
	for (var i = tabs.length - 1; i >= 0; i--) {
		tabs[i].style.display = 'none';
	};
}

window.onload = function(){
	//loadEverything();
	//see if you can set onclick on all elements under head in a single statement
/*	document.getElementById('faq-head').onclick = function(){
		navigate(this);
	}
	document.getElementById('more-head').onclick = function(){
		navigate(this);
	}
	document.getElementById('settings-head').onclick = function(){
		navigate(this);
	}
	document.getElementById('hot-keys').onclick = function(){
		var msg = {type:"createTab",url:"chrome://extensions/configureCommands "};
		sendMsgTobg(msg);	
	}
	navigate(document.getElementById('faq-head'));*/
}

function navigate(item){
	inactiveAll();
	hideAllTab();
	showTab(item.getAttribute('tab'));
	makeActive(item);
}

function makeActive(item){
	item.classList.add('active');
}

function inactiveAll(){
	var tabs = document.getElementsByClassName('head-link');
	for (var i = tabs.length - 1; i >= 0; i--) {
		tabs[i].classList.remove('active');
	};
}

function sendMsgTobg(msg){
	chrome.runtime.sendMessage(msg);
}


function loadEverything(){
	var content = '<div id="head">			<span id="faq-head" class="head-link" tab="faq-tab">FAQs</span>			<span id="settings-head" class="head-link" tab="settings-tab">Settings</span>			<span id="more-head" class="head-link" tab="more-tab">More</span>			<span id="how-to-head" class="head-link" tab="">How To</span>		</div>    			<div class="content" id="faq-tab">    		<div class="qa">    			<div class="ques">    				<span class="qa-head">Q.</span>    				<span class="ques-text">    					How do i add videos from youtube search results?    				</span>    			</div>    			<div class="ans">    				<span class="qa-head">A.</span>    				<span class="ans-text">    					You can add video by right click on the video link and choose add to queue option from qTube menu.    				</span>    			</div>    		</div>    		<div class="qa">    			<div class="ques">    				<span class="qa-head">Q.</span>    				<span class="ques-text">    					I accidently clicked on a link, now the queue is gone ?    				</span>    			</div>    			<div class="ans">    				<span class="qa-head">A.</span>    				<span class="ans-text">    					Relax, take a deep breath and press the back button of your browser.    				</span>    			</div>    		</div>    		<div class="qa">    			<div class="ques">    				<span class="qa-head">Q.</span>    				<span class="ques-text">    					Well The UI looks distored but it was working some time ago ?    				</span>    			</div>    			<div class="ans">    				<span class="qa-head">A.</span>    				<span class="ans-text">    					The UI is dependent on the youtube code also. So it may need an update.     					Please <a target="_blank" href="#">Report it here.</a>    				</span>    			</div>    		</div>    		<div class="qa">    			<div class="ques">    				<span class="qa-head">Q.</span>    				<span class="ques-text">    					How do i follow the updates and features?    				</span>    			</div>    			<div class="ans">    				<span class="qa-head">A.</span>    				<span class="ans-text">    					Like us on facebook <a target="_blank" href="http://www.facebook.com/qtubechrome">facebook.com/qtubechrome</a>    				</span>    			</div>    		</div>		</div>				<div class="content" id="settings-tab">    		<div class="setting">    			<div id="hot-keys">Set up Keyboard Shortcut</div>	    			<div><b>Default Shortcuts</b>	    			<div>Ctrl+Period : play/pause current video</div>	    			<div>Ctrl+Right Arrow : play previous video</div>	    			<div>Ctrl+Left Arrow: play next video</div>	    		</div>    		</div>		</div>		<div class="content" id="more-tab">    		<div class="action">				<a href="http://www.google.com" target="_blank">					<div class="but" id="bug">						<div class="icon">							<i class="fa fa-bug"></i>						</div>					</div>				</a>				<a href="http://www.google.com" target="_blank">					<div class="but" id="rate">						<div class="icon">							<i class="fa fa-star-half-full"></i>						</div>											</div>				</a>				<a href="http://www.facebook.com/qtubechrome" target="_blank">					<div class="but" id="share">					<div class="icon">						<i class="fa fa-facebook"></i>					</div>									</div></a>				<a href="https://github.com/gprabhat90/qTube" target="_blank"><div class="but" id="code">					<div class="icon">						<i class="fa fa-github"></i>					</div>									</div></a>							</div>			<div class="f-link">				<!-- <iframe src="http://www.facebook.com/plugins/like.php?href=https%3A%2F%2Fwww.facebook.com%2FQtubeChrome&amp;width=140&amp;layout=button_count&amp;action=like&amp;show_faces=true&amp;share=true&amp;height=21&amp;appId=119643698141744" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:140px; height:21px;" allowTransparency="true"></iframe> -->			</div>					</div>'
	var a=document.createElement('div');
	a.id="container";
	a.innerHTML=content;
	var player = document.getElementById('player');
	player.insertBefore(a,player.firstChild);
}

//3c8dbc blue