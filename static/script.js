
function switchForm(i) {
  if (i == 0) {
    console.log("Form 0")
    document.getElementById("verify").classList.replace("flex", "hidden")
    document.getElementById("add").classList.replace("hidden", "flex")
    document.getElementById("change").innerText = "Login"
    document.getElementById("change").setAttribute("onclick", "switchForm(1)")
  } else if (i == 1) {
    console.log("Form 1")
    document.getElementById("login").classList.replace("hidden", "flex")
    document.getElementById("add").classList.replace("flex", "hidden")
    document.getElementById("change").innerText = "Verify Session"
    document.getElementById("change").setAttribute("onclick", "switchForm(2)")
  } else if (i = 2) {
    document.getElementById("login").classList.replace("flex", "hidden")
    document.getElementById("verify").classList.replace("hidden", "flex")
    document.getElementById("change").innerText = "Add User"
    document.getElementById("change").setAttribute("onclick", "switchForm(0)")
  }
}
