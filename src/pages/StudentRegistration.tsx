import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Bluetooth, Loader2 } from "lucide-react"

export function StudentRegistration() {
  const { role: _role } = useAuth()
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    dept: "",
    year: "",
    section: "",
    bluetoothUuid: ""
  })

  const handleScan = async () => {
    setScanning(true)
    try {
        // Web Bluetooth API
        // Note: This requires a secure context (HTTPS) and user gesture.
        // It might not work in all environments without specific browser flags or hardware.
        const device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['battery_service'] // Example service
        })
        
        if (device) {
            setFormData(prev => ({ ...prev, bluetoothUuid: device.id }))
            // In a real app, we might connect and read a characteristic 
            // to get a specific beacon ID, but for now using device.id or name
        }
    } catch (error) {
        console.error("Bluetooth scan failed", error)
        alert("Bluetooth scan failed or cancelled. Please try again.")
    } finally {
        setScanning(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
        const { error } = await supabase.from('students').insert({
            name: formData.name,
            roll_no: formData.rollNo,
            dept: formData.dept,
            year: parseInt(formData.year),
            section: formData.section,
            bluetooth_uuid: formData.bluetoothUuid
        })

        if (error) throw error

        alert("Student registered successfully!")
        setFormData({ name: "", rollNo: "", dept: "", year: "", section: "", bluetoothUuid: "" })
    } catch (error: any) {
        console.error("Registration error:", error)
        alert("Failed to register student: " + error.message)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Student Registration</h1>
          <p className="text-muted-foreground">Add new students and link their Bluetooth beacons.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Student Details</CardTitle>
                    <CardDescription>Enter the academic details of the student.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input 
                                id="name" 
                                placeholder="John Doe" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rollNo">Roll Number</Label>
                            <Input 
                                id="rollNo" 
                                placeholder="21MH1A0..." 
                                value={formData.rollNo}
                                onChange={(e) => setFormData({...formData, rollNo: e.target.value})}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dept">Department</Label>
                                <Select onValueChange={(v) => setFormData({...formData, dept: v})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CSE">CSE</SelectItem>
                                        <SelectItem value="ECE">ECE</SelectItem>
                                        <SelectItem value="EEE">EEE</SelectItem>
                                        <SelectItem value="MECH">Mech</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="year">Year</Label>
                                <Select onValueChange={(v) => setFormData({...formData, year: v})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1st Year</SelectItem>
                                        <SelectItem value="2">2nd Year</SelectItem>
                                        <SelectItem value="3">3rd Year</SelectItem>
                                        <SelectItem value="4">4th Year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="section">Section</Label>
                            <Input 
                                id="section" 
                                placeholder="A, B, C..." 
                                value={formData.section}
                                onChange={(e) => setFormData({...formData, section: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="pt-4">
                             <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Register Student
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bluetooth Configuration</CardTitle>
                    <CardDescription>Scan related beacon or band to link.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 space-y-4">
                        <div className={`rounded-full p-4 ${formData.bluetoothUuid ? 'bg-green-100' : 'bg-muted'}`}>
                            <Bluetooth className={`h-8 w-8 ${formData.bluetoothUuid ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="text-center">
                            <h3 className="font-medium">{formData.bluetoothUuid ? "Beacon Linked" : "No Device Linked"}</h3>
                            <p className="text-sm text-muted-foreground">
                                {formData.bluetoothUuid || "Click scan to find a nearby BLE device"}
                            </p>
                        </div>
                        <Button variant={formData.bluetoothUuid ? "outline" : "default"} onClick={handleScan} disabled={scanning}>
                            {scanning ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                "Scan Nearby Devices"
                            )}
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="uuid">Manual UUID Entry (Optional)</Label>
                        <Input 
                            id="uuid" 
                            placeholder="Enter UUID manually if scan fails" 
                            value={formData.bluetoothUuid}
                            onChange={(e) => setFormData({...formData, bluetoothUuid: e.target.value})}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
