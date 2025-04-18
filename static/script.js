
function switchForm(i) {
  if (i == 0) {
    console.log("Form 0")
    document.getElementById("verify").classList.add("hidden")
    document.getElementById("add").classList.remove("hidden")
    document.getElementById("btn").innerText = "Login"
    document.getElementById("btn").setAttribute("onclick", "switchForm(1)")
  } else if (i == 1) {
    console.log("Form 1")
    document.getElementById("login").classList.remove("hidden")
    document.getElementById("add").classList.add("hidden")
    document.getElementById("btn").innerText = "Verify Session"
    document.getElementById("btn").setAttribute("onclick", "switchForm(2)")
  } else if (i = 2) {
    document.getElementById("login").classList.add("hidden")
    document.getElementById("verify").classList.remove("hidden")
    document.getElementById("btn").innerText = "Add User"
    document.getElementById("btn").setAttribute("onclick", "switchForm(0)")
  }
}
