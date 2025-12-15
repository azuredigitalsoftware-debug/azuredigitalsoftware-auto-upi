// Minimal site script: only dynamic pricing and year (interactive marketing features removed)

(function(){
	// set current year
	const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

	// dynamic pricing: compute discount percent and savings for price-card
	(function(){
		try{
			const priceCards = document.querySelectorAll('.price-card');
			priceCards.forEach(card=>{
				// set current year
				const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

				// dynamic pricing: compute discount percent and savings for price-card
				(function(){
					try{
						const priceCards = document.querySelectorAll('.price-card');
						priceCards.forEach(card=>{
							const newEl = card.querySelector('.new');
							const oldEl = card.querySelector('.old');
							const badgeEl = card.querySelector('.discount-badge');
							const saveEl = card.querySelector('.save-text');
							if(!newEl || !oldEl) return;
							const parseRupee = txt => { if(!txt) return NaN; const n = String(txt).replace(/[^0-9.]/g,''); return parseFloat(n)||NaN; };
							const newPrice = parseRupee(newEl.textContent);
							const oldPrice = parseRupee(oldEl.textContent);
							if(isNaN(newPrice) || isNaN(oldPrice) || oldPrice<=0) return;
							const savings = Math.round(oldPrice - newPrice);
							const percent = Math.round((1 - (newPrice/oldPrice))*100);
							if(badgeEl) badgeEl.textContent = (percent>0?'-'+percent+'%':'');
							if(saveEl) saveEl.textContent = 'You save ₹'+savings;
						});
					}catch(e){/* ignore */}
				})();

				// Countdown timer: parse existing mm:ss or default to 05:00
				(function(){
					const timerEl = document.getElementById('timer');
					if(!timerEl) return;
					// parse mm:ss -> seconds
					function parseToSeconds(text){
						if(!text) return NaN;
						const m = text.match(/(\d{1,2}):(\d{2})/);
						if(m){
							const mm = parseInt(m[1],10); const ss = parseInt(m[2],10);
							if(!isNaN(mm) && !isNaN(ss)) return mm*60 + ss;
						}
						// fallback if just a number (seconds)
						const asNum = parseInt(String(text).replace(/[^0-9]/g,''),10);
						return isNaN(asNum)?NaN:asNum;
					}

					let seconds = parseToSeconds(timerEl.textContent);
					if(isNaN(seconds) || seconds<=0) seconds = 5*60; // default 5 minutes

					let timerInterval = null;
					function render(){
						const mm = String(Math.floor(seconds/60)).padStart(2,'0');
						const ss = String(seconds%60).padStart(2,'0');
						timerEl.textContent = mm + ':' + ss;
					}

					function tick(){
						if(seconds<=0){
							render();
							clearInterval(timerInterval);
							return;
						}
						seconds--;
						render();
					}

					// initial render then start interval
					render();
					timerInterval = setInterval(tick, 1000);
				})();

			})();