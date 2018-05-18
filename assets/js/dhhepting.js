function currsem() {
	var today = new Date();
	var semnum = "";
	if (today.getMonth() >= 0 && today.getMonth() <= 3) {
		semnum = "10"
	} else
	if (today.getMonth() >= 4 && today.getMonth() <= 7) {
		semnum = "20"
	} else
	if (today.getMonth() >= 8 && today.getMonth() <= 11) {
		semnum = "30"
	}    
	var semurl = document.getElementById("semlink")
	semurl.setAttribute("href","/teaching/"+today.getFullYear() + semnum + ".html");
}
