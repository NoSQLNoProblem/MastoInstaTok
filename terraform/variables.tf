variable "budget_notification_emails" {
  description = "List of email addresses to receive AWS Budget notifications"
  type        = list(string)
  default     = [
    "shashin.gounden@bbd.co.za",
    "Cade.Sayner@bbd.co.za",
    "Franco.DuBuisson@bbd.co.za",
    "Kyle.Wilkins@bbd.co.za",
    "Gregory.Maselle@bbd.co.za",
    "rudolphe@bbdsoftware.com"
  ]
}