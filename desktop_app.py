#!/usr/bin/env python3
"""
Avenly Smart Touch Hub - AvenlyOS 26 Desktop Edition
Fully implemented in Python 3 using Tkinter GUI.
This simulates the complete 7-inch tablet Touch Hub designed by Avenly.
"""

import tkinter as tk
from tkinter import ttk, messagebox
import time
import random
import threading

class PAIOApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Avenly Smart Touch Hub - AvenlyOS 26 Desktop Edition")
        
        # Lock window to standard 7-inch tablet screen aspect ratio (960x560)
        self.geometry("960x560")
        self.resizable(False, False)
        
        # Color Palette - PAIO Obsidian PAIOS 26 Pro (Matte dark greys, vivid neon indicator accents)
        self.colors = {
            "bg": "#060709",          # Deep PAIOS canvas
            "panel": "#111215",       # Glassmorphic base
            "card": "#18191d",        # Control widget grey
            "border": "#2c2d33",      # Crisp hardware chamfer
            "accent": "#007aff",      # PAIO Blue
            "green": "#30d158",       # Active / Normal Ring
            "orange": "#ff9f0a",      # Dose Warning
            "red": "#ff453a",         # Critical Fall Alert
            "purple": "#af52de",      # PAIO Intelligence Siri glow
            "text": "#ffffff",        # Primary label
            "subtext": "#8e8e93",     # PAIO muted grey
        }
        
        self.configure(bg=self.colors["bg"])
        
        # App Variables
        self.active_tab = "Home"
        self.heart_rate = 74
        self.blood_oxygen = 98
        self.steps = 3450
        self.is_fall_detected = False
        self.fall_countdown = 30
        self.vitals_running = True
        self.dispensing_active = False
        self.active_call_contact = None
        self.wifi_connected = True
        self.bt_connected = True
        
        # Chat History
        self.chat_history = [
            ("siri", "Hello Margaret, I'm your PAIO Companion. How can I help you today?")
        ]
        
        # Medications List
        self.medications = [
            {"id": 1, "name": "Metformin 500mg", "time": "08:00 AM", "qty": 1, "status": "Taken", "color": "#af52de"},
            {"id": 2, "name": "Lisinopril 10mg", "time": "12:30 PM", "qty": 1, "status": "Upcoming", "color": "#007aff"},
            {"id": 3, "name": "Atorvastatin 20mg", "time": "09:00 PM", "qty": 1, "status": "Upcoming", "color": "#30d158"},
        ]
        
        # Set window background style
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background=self.colors["panel"])
        
        # Master hardware shell
        self.build_hardware_frame()
        
        # Start vital simulation threads
        self.vital_thread = threading.Thread(target=self.simulate_vitals, daemon=True)
        self.vital_thread.start()
        
        # Start real-time digital clock
        self.update_clock()

    def build_hardware_frame(self):
        """Builds the matte-black premium outer bezel and high-contrast screen canvas"""
        # Matte-Black Physical Hub Bezel
        bezel = tk.Frame(self, bg=self.colors["panel"], bd=1, relief="flat")
        bezel.place(x=10, y=10, width=940, height=540)
        
        # The OS Screen Screen Canvas
        self.screen = tk.Frame(bezel, bg=self.colors["bg"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        self.screen.place(x=8, y=8, width=924, height=524)
        
        # Build Status Bar & Navigation Dock
        self.build_status_bar()
        self.build_navigation_dock()
        
        # Frame Container for application views
        self.view_container = tk.Frame(self.screen, bg=self.colors["bg"])
        self.view_container.place(x=0, y=36, width=924, height=414)
        
        # Show default home screen
        self.show_view("Home")

    def build_status_bar(self):
        """Creates the PAIO premium top PAIOS 26 style status bar"""
        status_bar = tk.Frame(self.screen, bg=self.colors["bg"], height=32)
        status_bar.pack(side="top", fill="x", padx=15)
        
        # Left status indicators
        self.lbl_time = tk.Label(status_bar, text="09:41 AM", font=("Helvetica", 11, "bold"), fg=self.colors["text"], bg=self.colors["bg"])
        self.lbl_time.pack(side="left")
        
        # Right status icons
        self.lbl_conn = tk.Label(status_bar, text="📶 Wi-Fi Connected  |  🎧 Bluetooth Connected  |  🔋 100% Charged  |  PAIOS 26.0 Pro", 
                                 font=("Helvetica", 9), fg=self.colors["subtext"], bg=self.colors["bg"])
        self.lbl_conn.pack(side="right")
        
        # Subtle horizontal divider
        div = tk.Frame(self.screen, bg=self.colors["border"], height=1)
        div.place(x=0, y=32, width=924)

    def build_navigation_dock(self):
        """Creates an authentic floating PAIO PAIOS bottom glass Dock with app icons"""
        dock_frame = tk.Frame(self.screen, bg="transparent")
        dock_frame.place(x=202, y=456, width=520, height=56)
        
        # Simulated PAIOS blur-glass backdrop canvas
        canvas = tk.Canvas(dock_frame, bg=self.colors["bg"], highlightthickness=1, highlightbackground=self.colors["border"])
        canvas.place(x=0, y=0, width=520, height=56)
        
        # Create apps layout inside Dock
        apps = [
            ("🏠 Home", "Home"),
            ("❤️ Health", "Health"),
            ("💊 Meds", "Meds"),
            ("🔮 PAIO AI", "Siri"),
            ("📹 Video", "FaceTime"),
            ("⚙️ Settings", "Settings")
        ]
        
        self.dock_buttons = {}
        col = 0
        for label, tab_id in apps:
            btn = tk.Button(
                dock_frame,
                text=label,
                font=("Helvetica", 11, "bold"),
                fg=self.colors["subtext"],
                bg=self.colors["card"],
                activebackground=self.colors["border"],
                activeforeground=self.colors["text"],
                bd=0,
                cursor="hand2",
                command=lambda tid=tab_id: self.show_view(tid)
            )
            btn.place(x=10 + col * 84, y=8, width=76, height=40)
            self.dock_buttons[tab_id] = btn
            col += 1

    def show_view(self, tab_id):
        """Transitions between various active apps on the PAIOS 26 operating system"""
        self.active_tab = tab_id
        
        # Reset Dock visual indicators to replicate native PAIO selection
        for tid, btn in self.dock_buttons.items():
            if tid == tab_id:
                btn.configure(fg=self.colors["accent"], bg=self.colors["border"])
            else:
                btn.configure(fg=self.colors["subtext"], bg=self.colors["card"])
                
        # Flush viewport
        for widget in self.view_container.winfo_children():
            widget.destroy()
            
        # Draw target iOS app layout
        if tab_id == "Home":
            self.draw_home_view()
        elif tab_id == "Health":
            self.draw_health_view()
        elif tab_id == "Meds":
            self.draw_meds_view()
        elif tab_id == "Siri":
            self.draw_siri_view()
        elif tab_id == "FaceTime":
            self.draw_facetime_view()
        elif tab_id == "Settings":
            self.draw_settings_view()

    # ------------------ APP VIEWS ------------------

    def draw_home_view(self):
        """Draws the dynamic PAIO Hub style Home Screen widgets"""
        # Outer grid
        canvas = tk.Frame(self.view_container, bg=self.colors["bg"])
        canvas.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Left Side Widget: Live Health Card
        health_card = tk.Frame(canvas, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        health_card.place(x=0, y=0, width=220, height=394)
        
        lbl_h_title = tk.Label(health_card, text="PAIO Health", font=("Helvetica", 12, "bold"), fg=self.colors["red"], bg=self.colors["card"])
        lbl_h_title.pack(anchor="w", padx=15, pady=(15, 5))
        
        # Ring values
        tk.Label(health_card, text="Heart Rate", font=("Helvetica", 10), fg=self.colors["subtext"], bg=self.colors["card"]).pack(anchor="w", padx=15)
        self.lbl_home_hr = tk.Label(health_card, text=f"{self.heart_rate} BPM", font=("Helvetica", 20, "bold"), fg=self.colors["text"], bg=self.colors["card"])
        self.lbl_home_hr.pack(anchor="w", padx=15, pady=(0, 15))
        
        tk.Label(health_card, text="Blood Oxygen", font=("Helvetica", 10), fg=self.colors["subtext"], bg=self.colors["card"]).pack(anchor="w", padx=15)
        self.lbl_home_sp = tk.Label(health_card, text=f"{self.blood_oxygen}% SpO2", font=("Helvetica", 20, "bold"), fg=self.colors["text"], bg=self.colors["card"])
        self.lbl_home_sp.pack(anchor="w", padx=15, pady=(0, 15))

        tk.Label(health_card, text="Daily Steps", font=("Helvetica", 10), fg=self.colors["subtext"], bg=self.colors["card"]).pack(anchor="w", padx=15)
        self.lbl_home_steps = tk.Label(health_card, text=f"{self.steps} steps", font=("Helvetica", 20, "bold"), fg=self.colors["text"], bg=self.colors["card"])
        self.lbl_home_steps.pack(anchor="w", padx=15, pady=(0, 15))
        
        # Action Simulator: Trigger Fall Alert
        btn_fall = tk.Button(
            health_card,
            text="🚨 Simulate Fall",
            font=("Helvetica", 10, "bold"),
            fg=self.colors["text"],
            bg=self.colors["red"],
            activebackground="#cc342c",
            activeforeground="white",
            bd=0,
            cursor="hand2",
            command=self.trigger_fall_sim
        )
        btn_fall.pack(side="bottom", fill="x", padx=15, pady=15)

        # Center Widget: Oversized Aesthetic Lock Screen Clock
        clock_container = tk.Frame(canvas, bg=self.colors["bg"])
        clock_container.place(x=240, y=0, width=400, height=394)
        
        self.lbl_big_time = tk.Label(clock_container, text="09:41", font=("Helvetica", 68, "light"), fg=self.colors["text"], bg=self.colors["bg"])
        self.lbl_big_time.pack(pady=(80, 0))
        
        self.lbl_big_date = tk.Label(clock_container, text="Saturday, July 18", font=("Helvetica", 16, "bold"), fg=self.colors["subtext"], bg=self.colors["bg"])
        self.lbl_big_date.pack()
        
        # PAIO Intelligence ambient pulse badge
        siri_badge = tk.Frame(clock_container, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        siri_badge.pack(pady=40)
        tk.Label(siri_badge, text="🔮 Powered by PAIO Intelligence", font=("Helvetica", 10, "italic"), fg=self.colors["purple"], bg=self.colors["card"], padx=15, pady=6).pack()

        # Right Side Widget: Scheduled Medications Tracker
        meds_card = tk.Frame(canvas, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        meds_card.place(x=660, y=0, width=224, height=394)
        
        tk.Label(meds_card, text="Meds Tracker", font=("Helvetica", 12, "bold"), fg=self.colors["purple"], bg=self.colors["card"]).pack(anchor="w", padx=15, pady=(15, 10))
        
        for m in self.medications:
            m_item = tk.Frame(meds_card, bg=self.colors["bg"], bd=0, highlightthickness=1, highlightbackground=self.colors["border"])
            m_item.pack(fill="x", padx=12, pady=4, ipady=6)
            
            # Left vertical stripe indicating pill color
            stripe = tk.Frame(m_item, bg=m["color"], width=4)
            stripe.pack(side="left", fill="y")
            
            # Capsule Label
            info = tk.Frame(m_item, bg=self.colors["bg"])
            info.pack(side="left", fill="both", expand=True, padx=8)
            tk.Label(info, text=m["name"], font=("Helvetica", 10, "bold"), fg=self.colors["text"], bg=self.colors["bg"]).pack(anchor="w")
            tk.Label(info, text=f"{m['time']} • Qty: {m['qty']}", font=("Helvetica", 8), fg=self.colors["subtext"], bg=self.colors["bg"]).pack(anchor="w")
            
            # Status badge
            status_lbl = tk.Label(m_item, text=m["status"], font=("Helvetica", 8, "bold"), fg=self.colors["green"] if m["status"] == "Taken" else self.colors["orange"], bg=self.colors["bg"])
            status_lbl.pack(side="right", padx=8)

    def draw_health_view(self):
        """Displays PAIO Health metrics detail page with animated graphs"""
        canvas = tk.Frame(self.view_container, bg=self.colors["bg"])
        canvas.pack(fill="both", expand=True, padx=25, pady=15)
        
        # App Title
        tk.Label(canvas, text="❤️ PAIO Health", font=("Helvetica", 18, "bold"), fg=self.colors["text"], bg=self.colors["bg"]).pack(anchor="w", pady=(0, 15))
        
        # Grid of metrics
        metrics = [
            ("Heart Rate Tracker", f"{self.heart_rate} BPM", "Normal: 60-90 BPM", "Safe Waveform Pattern", self.colors["red"]),
            ("Pulse Oximeter", f"{self.blood_oxygen}% SpO2", "Normal: 95-100%", "Perfect gas exchange index", self.colors["accent"]),
            ("Step Count Tracker", f"{self.steps} Steps", "Daily Target: 5,000", "Margaret is active in Kitchen", self.colors["green"]),
            ("Sleep Quality Index", "7h 45m", "Optimal: 7-9 hours", "Consistent circadian rhythm", self.colors["purple"])
        ]
        
        self.health_lbls = {}
        grid_frame = tk.Frame(canvas, bg=self.colors["bg"])
        grid_frame.pack(fill="both", expand=True)
        
        for i, (title, val, sub, desc, color) in enumerate(metrics):
            r = i // 2
            c = i % 2
            
            card = tk.Frame(grid_frame, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
            card.grid(row=r, column=c, sticky="nsew", padx=8, pady=8)
            grid_frame.grid_rowconfigure(r, weight=1)
            grid_frame.grid_columnconfigure(c, weight=1)
            
            # Inner details
            lbl_title = tk.Label(card, text=title, font=("Helvetica", 11, "bold"), fg=color, bg=self.colors["card"])
            lbl_title.pack(anchor="w", padx=15, pady=(12, 4))
            
            lbl_val = tk.Label(card, text=val, font=("Helvetica", 24, "bold"), fg=self.colors["text"], bg=self.colors["card"])
            lbl_val.pack(anchor="w", padx=15)
            self.health_lbls[title] = lbl_val
            
            tk.Label(card, text=sub, font=("Helvetica", 9), fg=self.colors["subtext"], bg=self.colors["card"]).pack(anchor="w", padx=15)
            tk.Label(card, text=desc, font=("Helvetica", 9, "italic"), fg=self.colors["subtext"], bg=self.colors["card"]).pack(anchor="w", padx=15, pady=(6, 12))

    def draw_meds_view(self):
        """Elegant PAIO style Medications dosage planner and instant dispenser"""
        canvas = tk.Frame(self.view_container, bg=self.colors["bg"])
        canvas.pack(fill="both", expand=True, padx=25, pady=15)
        
        # App Title
        tk.Label(canvas, text="💊 PAIO Medications Tracker", font=("Helvetica", 18, "bold"), fg=self.colors["text"], bg=self.colors["bg"]).pack(anchor="w", pady=(0, 5))
        tk.Label(canvas, text="Ensure Margaret has taken today's smart-scheduled capsule doses with water.", font=("Helvetica", 10), fg=self.colors["subtext"], bg=self.colors["bg"]).pack(anchor="w", pady=(0, 15))
        
        # Dispenser container layout
        cols = tk.Frame(canvas, bg=self.colors["bg"])
        cols.pack(fill="both", expand=True)
        
        # Left: Pill list
        p_list = tk.Frame(cols, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        p_list.pack(side="left", fill="both", expand=True, padx=(0, 10))
        
        tk.Label(p_list, text="Daily Capsule Grid", font=("Helvetica", 12, "bold"), fg=self.colors["text"], bg=self.colors["card"]).pack(anchor="w", padx=15, pady=15)
        
        for m in self.medications:
            item = tk.Frame(p_list, bg=self.colors["bg"], bd=0, highlightthickness=1, highlightbackground=self.colors["border"])
            item.pack(fill="x", padx=15, pady=6, ipady=8)
            
            stripe = tk.Frame(item, bg=m["color"], width=4)
            stripe.pack(side="left", fill="y")
            
            lbls = tk.Frame(item, bg=self.colors["bg"])
            lbls.pack(side="left", padx=10)
            tk.Label(lbls, text=m["name"], font=("Helvetica", 11, "bold"), fg=self.colors["text"], bg=self.colors["bg"]).pack(anchor="w")
            tk.Label(lbls, text=f"Dose Time: {m['time']}  |  Take {m['qty']} tablet", font=("Helvetica", 9), fg=self.colors["subtext"], bg=self.colors["bg"]).pack(anchor="w")
            
            if m["status"] == "Upcoming":
                btn = tk.Button(
                    item,
                    text="Take Now",
                    font=("Helvetica", 9, "bold"),
                    fg=self.colors["text"],
                    bg=self.colors["accent"],
                    activebackground="#0056b3",
                    activeforeground="white",
                    bd=0,
                    cursor="hand2",
                    command=lambda mid=m["id"]: self.dispense_medication(mid)
                )
                btn.pack(side="right", padx=15)
            else:
                tk.Label(item, text="✅ Taken", font=("Helvetica", 10, "bold"), fg=self.colors["green"], bg=self.colors["bg"]).pack(side="right", padx=15)

        # Right: Bezel graphic simulator
        right_panel = tk.Frame(cols, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"], width=280)
        right_panel.pack(side="right", fill="both", padx=(10, 0))
        right_panel.pack_propagate(False)
        
        tk.Label(right_panel, text="Hub Status", font=("Helvetica", 12, "bold"), fg=self.colors["text"], bg=self.colors["card"]).pack(pady=15)
        
        # Status Circular Canvas (Simulates dynamic state colors)
        self.disp_indicator = tk.Canvas(right_panel, width=120, height=120, bg=self.colors["card"], highlightthickness=0)
        self.disp_indicator.pack(pady=10)
        self.draw_disp_ring("standby")
        
        self.lbl_disp_status = tk.Label(right_panel, text="Hub: Ready", font=("Helvetica", 12, "bold"), fg=self.colors["green"], bg=self.colors["card"])
        self.lbl_disp_status.pack(pady=10)
        
        tk.Label(right_panel, text="Safe Dosage Locked\nAnti-double dose control is ACTIVE", font=("Helvetica", 9, "italic"), fg=self.colors["subtext"], bg=self.colors["card"], textjustify="center").pack()

    def draw_disp_ring(self, state):
        self.disp_indicator.delete("all")
        color = self.colors["green"]
        if state == "dispensing":
            color = self.colors["accent"]
        elif state == "pulsing":
            color = self.colors["orange"]
            
        self.disp_indicator.create_oval(10, 10, 110, 110, outline=color, width=6)
        icon_text = "Ready" if state == "standby" else "Active" if state == "dispensing" else "Alert"
        self.disp_indicator.create_text(60, 60, text=icon_text, fill=color, font=("Helvetica", 12, "bold"))

    def dispense_medication(self, med_id):
        if self.dispensing_active:
            return
        
        self.dispensing_active = True
        self.draw_disp_ring("dispensing")
        self.lbl_disp_status.configure(text="Dispensing Tablet...", fg=self.colors["accent"])
        
        def run_dispense():
            time.sleep(2.5) # Simulate physical drawer activation delay
            for m in self.medications:
                if m["id"] == med_id:
                    m["status"] = "Taken"
                    
            self.dispensing_active = False
            self.draw_disp_ring("standby")
            self.lbl_disp_status.configure(text="Dose Successful!", fg=self.colors["green"])
            messagebox.showinfo("PAIO Hub", "Capsule dispensed successfully! Reassuring Margaret to take it with fresh water.")
            self.show_view("Meds")
            
        threading.Thread(target=run_dispense, daemon=True).start()

    def draw_siri_view(self):
        """Displays PAIO Intelligence modern neon glow multi-turn chat widget"""
        canvas = tk.Frame(self.view_container, bg=self.colors["bg"])
        canvas.pack(fill="both", expand=True, padx=25, pady=15)
        
        # App Title with neon PAIO style
        tk.Label(canvas, text="🔮 PAIO Assistant (PAIO Intelligence)", font=("Helvetica", 16, "bold"), fg=self.colors["purple"], bg=self.colors["bg"]).pack(anchor="w", pady=(0, 2))
        tk.Label(canvas, text="Voice synthesis and automated health safety insights are online.", font=("Helvetica", 9), fg=self.colors["subtext"], bg=self.colors["bg"]).pack(anchor="w", pady=(0, 10))
        
        # Conversation history scroll view
        history_frame = tk.Frame(canvas, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        history_frame.pack(fill="both", expand=True, pady=(0, 10))
        
        self.txt_history = tk.Text(history_frame, bg=self.colors["card"], fg=self.colors["text"], font=("Helvetica", 11), wrap="word", bd=0, state="normal", padx=15, pady=15)
        self.txt_history.pack(fill="both", expand=True)
        self.render_chat()
        
        # Input entry panel
        input_panel = tk.Frame(canvas, bg="transparent")
        input_panel.pack(fill="x")
        
        self.ent_msg = tk.Entry(input_panel, bg=self.colors["card"], fg=self.colors["text"], font=("Helvetica", 12), bd=1, relief="solid", highlightthickness=0, insertbackground="white")
        self.ent_msg.pack(side="left", fill="x", expand=True, ipady=8, padx=(0, 10))
        self.ent_msg.bind("<Return>", lambda event: self.send_siri_msg())
        
        btn_send = tk.Button(
            input_panel,
            text="Ask PAIO",
            font=("Helvetica", 10, "bold"),
            fg=self.colors["text"],
            bg=self.colors["purple"],
            activebackground="#8e3bb3",
            activeforeground="white",
            bd=0,
            cursor="hand2",
            command=self.send_siri_msg
        )
        btn_send.pack(side="right", fill="y", ipady=8, padx=2)

    def render_chat(self):
        self.txt_history.configure(state="normal")
        self.txt_history.delete("1.0", "end")
        for sender, text in self.chat_history:
            if sender == "user":
                self.txt_history.insert("end", f"Margaret: {text}\n\n", "user_tag")
            else:
                self.txt_history.insert("end", f"PAIO: {text}\n\n", "siri_tag")
                
        self.txt_history.tag_configure("user_tag", foreground=self.colors["accent"], font=("Helvetica", 11, "bold"))
        self.txt_history.tag_configure("siri_tag", foreground=self.colors["purple"], font=("Helvetica", 11))
        self.txt_history.configure(state="disabled")
        self.txt_history.see("end")

    def send_siri_msg(self):
        msg = self.ent_msg.get().strip()
        if not msg:
            return
        
        self.chat_history.append(("user", msg))
        self.ent_msg.delete(0, "end")
        self.render_chat()
        
        # Reassuring smart PAIO replies
        replies = [
            "Margaret, your heart rate and pulse oximeter look exceptional today. Please rest easy.",
            "I've checked your medications. Your Lisinopril dose is scheduled for 12:30 PM. I'll alert you then.",
            "Don't worry, Margaret. Your daughter Preeti and I are keeping a very close watch on your home's security logs.",
            "That's a great question! Let's schedule a PAIO video call with Dr. Rajesh to make absolutely sure."
        ]
        
        # Auto response thread for realism
        def auto_reply():
            time.sleep(1.2)
            reply = random.choice(replies)
            if "hello" in msg.lower() or "hi" in msg.lower():
                reply = "Hello Margaret! Rest assured, I am fully active and ready to keep you safe today."
            elif "pills" in msg.lower() or "med" in msg.lower():
                reply = "Your next scheduled dose is Lisinopril 10mg at 12:30 PM. I will dispense it immediately when due."
            elif "daughter" in msg.lower() or "preeti" in msg.lower():
                reply = "Preeti is currently connected as your primary caregiver. You can initiate a PAIO call anytime."
                
            self.chat_history.append(("siri", reply))
            self.render_chat()
            
        threading.Thread(target=auto_reply, daemon=True).start()

    def draw_facetime_view(self):
        """Authentic high-fidelity PAIO video calling and active connection window"""
        canvas = tk.Frame(self.view_container, bg=self.colors["bg"])
        canvas.pack(fill="both", expand=True, padx=25, pady=15)
        
        # Title
        tk.Label(canvas, text="📹 PAIO Video", font=("Helvetica", 18, "bold"), fg=self.colors["text"], bg=self.colors["bg"]).pack(anchor="w", pady=(0, 10))
        
        # Grid
        layout = tk.Frame(canvas, bg=self.colors["bg"])
        layout.pack(fill="both", expand=True)
        
        # Left: Quick Speed dials
        contacts = [
            ("👩‍💼 Preeti (Daughter)", "Primary Caregiver", "🟢 Online"),
            ("👨‍⚕️ Dr. Rajesh Sharma", "Cardiologist", "🟢 Online"),
            ("🚨 Dispatch Center", "Emergency EMS", "🔴 Critical Response")
        ]
        
        left_list = tk.Frame(layout, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        left_list.pack(side="left", fill="both", expand=True, padx=(0, 10))
        
        tk.Label(left_list, text="PAIO Contacts", font=("Helvetica", 12, "bold"), fg=self.colors["text"], bg=self.colors["card"]).pack(anchor="w", padx=15, pady=12)
        
        for name, sub, stat in contacts:
            c_box = tk.Frame(left_list, bg=self.colors["bg"], bd=0, highlightthickness=1, highlightbackground=self.colors["border"])
            c_box.pack(fill="x", padx=15, pady=4, ipady=6)
            
            det = tk.Frame(c_box, bg=self.colors["bg"])
            det.pack(side="left", padx=10)
            tk.Label(det, text=name, font=("Helvetica", 11, "bold"), fg=self.colors["text"], bg=self.colors["bg"]).pack(anchor="w")
            tk.Label(det, text=f"{sub}  •  {stat}", font=("Helvetica", 8), fg=self.colors["subtext"], bg=self.colors["bg"]).pack(anchor="w")
            
            btn_call = tk.Button(
                c_box,
                text="PAIO Call",
                font=("Helvetica", 9, "bold"),
                fg="white",
                bg=self.colors["green"] if "Emergency" not in name else self.colors["red"],
                activebackground="#24a044",
                activeforeground="white",
                bd=0,
                cursor="hand2",
                command=lambda n=name: self.start_facetime_call(n)
            )
            btn_call.pack(side="right", padx=12)

        # Right: Simulated Active Call Viewfinder
        self.right_call = tk.Frame(layout, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"], width=320)
        self.right_call.pack(side="right", fill="both", padx=(10, 0))
        self.right_call.pack_propagate(False)
        self.render_inactive_viewfinder()

    def render_inactive_viewfinder(self):
        for w in self.right_call.winfo_children():
            w.destroy()
        tk.Label(self.right_call, text="No Active Call", font=("Helvetica", 12, "bold"), fg=self.colors["subtext"], bg=self.colors["card"]).pack(expand=True)

    def start_facetime_call(self, contact):
        for w in self.right_call.winfo_children():
            w.destroy()
            
        self.active_call_contact = contact
        
        tk.Label(self.right_call, text=f"Calling {contact}...", font=("Helvetica", 11, "bold"), fg=self.colors["accent"], bg=self.colors["card"]).pack(pady=15)
        
        # Camera simulation box
        cam_sim = tk.Frame(self.right_call, bg=self.colors["bg"], width=280, height=180, bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        cam_sim.pack(pady=10)
        cam_sim.pack_propagate(False)
        tk.Label(cam_sim, text="[ Simulated PAIOS Camera ]\nMargaret Avatar: Connected\nHigh-definition voice", font=("Helvetica", 9, "italic"), fg=self.colors["subtext"], bg=self.colors["bg"], textjustify="center").pack(expand=True)
        
        # End Call Button
        btn_end = tk.Button(
            self.right_call,
            text="End PAIO Call",
            font=("Helvetica", 10, "bold"),
            fg="white",
            bg=self.colors["red"],
            activebackground="#cc342c",
            activeforeground="white",
            bd=0,
            cursor="hand2",
            command=self.end_facetime_call
        )
        btn_end.pack(fill="x", padx=20, pady=15)

    def end_facetime_call(self):
        self.active_call_contact = None
        self.render_inactive_viewfinder()

    def draw_settings_view(self):
        """Displays standard PAIO system settings panel"""
        canvas = tk.Frame(self.view_container, bg=self.colors["bg"])
        canvas.pack(fill="both", expand=True, padx=25, pady=15)
        
        # App Title
        tk.Label(canvas, text="⚙️ PAIOS Settings", font=("Helvetica", 18, "bold"), fg=self.colors["text"], bg=self.colors["bg"]).pack(anchor="w", pady=(0, 15))
        
        # Settings Container
        box = tk.Frame(canvas, bg=self.colors["card"], bd=1, highlightthickness=1, highlightbackground=self.colors["border"])
        box.pack(fill="both", expand=True, padx=15, pady=15)
        
        tk.Label(box, text="Hardware Settings", font=("Helvetica", 12, "bold"), fg=self.colors["accent"], bg=self.colors["card"]).pack(anchor="w", pady=(0, 10))
        
        # Connection status sliders
        vol_frame = tk.Frame(box, bg=self.colors["card"])
        vol_frame.pack(fill="x", pady=8)
        tk.Label(vol_frame, text="Speaker Volume Booster (0-100%):", font=("Helvetica", 10), fg=self.colors["text"], bg=self.colors["card"]).pack(side="left")
        
        slider = tk.Scale(vol_frame, from_=0, to=100, orient="horizontal", bg=self.colors["card"], fg=self.colors["text"], highlightthickness=0, bd=0)
        slider.set(80)
        slider.pack(side="right", fill="x", expand=True, padx=15)
        
        # Device Specs
        specs = [
            ("PAIO Smart Touch Hub Model", "PAIO Touch Hub 7\" Pro (16GB)"),
            ("Processor Node", "PAIO A18 Bionic Smart Core Engine"),
            ("Operating System Kernel", "PAIOS 26.0 - Build 26A189s")
        ]
        
        for k, v in specs:
            f = tk.Frame(box, bg=self.colors["card"], pady=6)
            f.pack(fill="x")
            tk.Label(f, text=k, font=("Helvetica", 10, "bold"), fg=self.colors["subtext"], bg=self.colors["card"]).pack(side="left")
            tk.Label(f, text=v, font=("Helvetica", 10, "mono"), fg=self.colors["text"], bg=self.colors["card"]).pack(side="right")

    # ------------------ EVENT SIMULATORS ------------------

    def simulate_vitals(self):
        """Simulates real-time vital telemetry fluctuations"""
        while self.vitals_running:
            if not self.is_fall_detected:
                self.heart_rate = random.randint(72, 85)
                self.blood_oxygen = random.choice([97, 98, 99])
                self.steps += random.choice([0, 1, 2, 4])
                
            # If home view is active, update the label displays immediately
            if self.active_tab == "Home":
                try:
                    self.lbl_home_hr.configure(text=f"{self.heart_rate} BPM")
                    self.lbl_home_sp.configure(text=f"{self.blood_oxygen}% SpO2")
                    self.lbl_home_steps.configure(text=f"{self.steps} steps")
                except Exception:
                    pass
            elif self.active_tab == "Health":
                try:
                    self.health_lbls["Heart Rate Tracker"].configure(text=f"{self.heart_rate} BPM")
                    self.health_lbls["Pulse Oximeter"].configure(text=f"{self.blood_oxygen}% SpO2")
                    self.health_lbls["Step Count Tracker"].configure(text=f"{self.steps} Steps")
                except Exception:
                    pass
                    
            time.sleep(3.0)

    def update_clock(self):
        """Updates top status clock and home widgets"""
        now = time.strftime("%I:%M %p")
        date_str = time.strftime("%A, %B %d")
        
        try:
            self.lbl_time.configure(text=now)
            if self.active_tab == "Home":
                self.lbl_big_time.configure(text=time.strftime("%I:%M"))
                self.lbl_big_date.configure(text=date_str)
        except Exception:
            pass
            
        self.after(1000, self.update_clock)

    def trigger_fall_sim(self):
        """Triggers the PAIOS 26 High-Impact Fall Overlay and Beep warning countdown"""
        if self.is_fall_detected:
            return
            
        self.is_fall_detected = True
        self.fall_countdown = 30
        
        # Build Overlay
        self.overlay = tk.Toplevel(self)
        self.overlay.title("🚨 FALL DETECTED")
        self.overlay.geometry("540x440+210+80")
        self.overlay.resizable(False, False)
        self.overlay.configure(bg="#090101")
        self.overlay.transient(self)
        self.overlay.grab_set()
        
        # Large Pulsing Icon
        tk.Label(self.overlay, text="🚨", font=("Helvetica", 40), bg="#090101").pack(pady=20)
        tk.Label(self.overlay, text="Fall Registered", font=("Helvetica", 18, "bold"), fg=self.colors["red"], bg="#090101").pack()
        tk.Label(self.overlay, text="Avenly wrist protective mesh registered a sudden orientation shift.", font=("Helvetica", 10), fg=self.colors["subtext"], bg="#090101", padx=10, pady=10).pack()
        
        self.lbl_ct = tk.Label(self.overlay, text="30", font=("Helvetica", 48, "bold"), fg="white", bg="#090101")
        self.lbl_ct.pack(pady=10)
        
        self.lbl_warn = tk.Label(self.overlay, text="Dispatching emergency services shortly...", font=("Helvetica", 10, "italic"), fg=self.colors["orange"], bg="#090101")
        self.lbl_warn.pack(pady=10)
        
        # Actions Grid
        btns = tk.Frame(self.overlay, bg="#090101")
        btns.pack(fill="x", side="bottom", padx=20, pady=20)
        
        btn_ok = tk.Button(
            btns,
            text="I AM OKAY (Dismiss)",
            font=("Helvetica", 11, "bold"),
            fg=self.colors["text"],
            bg=self.colors["card"],
            activebackground=self.colors["border"],
            activeforeground="white",
            bd=0,
            cursor="hand2",
            command=self.dismiss_fall
        )
        btn_ok.pack(side="left", fill="x", expand=True, padx=10, ipady=10)
        
        btn_help = tk.Button(
            btns,
            text="I NEED HELP",
            font=("Helvetica", 11, "bold"),
            fg="white",
            bg=self.colors["red"],
            activebackground="#cc342c",
            activeforeground="white",
            bd=0,
            cursor="hand2",
            command=self.trigger_emergency
        )
        btn_help.pack(side="right", fill="x", expand=True, padx=10, ipady=10)
        
        self.run_fall_countdown()

    def run_fall_countdown(self):
        if not self.is_fall_detected:
            return
            
        if self.fall_countdown <= 0:
            self.trigger_emergency()
            return
            
        self.lbl_ct.configure(text=str(self.fall_countdown))
        self.fall_countdown -= 1
        self.overlay.after(1000, self.run_fall_countdown)

    def dismiss_fall(self):
        self.is_fall_detected = False
        try:
            self.overlay.destroy()
        except Exception:
            pass
        messagebox.showinfo("PAIO Hub", "Fall alarm dismissed. Rest assured, Margaret.")

    def trigger_emergency(self):
        self.is_fall_detected = False
        try:
            self.overlay.destroy()
        except Exception:
            pass
        self.show_view("FaceTime")
        self.start_facetime_call("🚨 Dispatch Center (Emergency)")
        messagebox.showwarning("Emergency Dispatch", "EMS (911) and Preeti have been automatically summoned to your location.")

if __name__ == "__main__":
    app = PAIOApp()
    app.mainloop()
