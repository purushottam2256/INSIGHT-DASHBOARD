import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		colors: {
  			border: "hsl(var(--border))",
  			input: "hsl(var(--input))",
  			ring: "hsl(var(--ring))",
  			background: "hsl(var(--background))",
  			foreground: "hsl(var(--foreground))",
  			primary: {
  				DEFAULT: "hsl(var(--primary))",
  				foreground: "hsl(var(--primary-foreground))",
  			},
  			secondary: {
  				DEFAULT: "hsl(var(--secondary))",
  				foreground: "hsl(var(--secondary-foreground))",
  			},
  			destructive: {
  				DEFAULT: "hsl(var(--destructive))",
  				foreground: "hsl(var(--destructive-foreground))",
  			},
  			muted: {
  				DEFAULT: "hsl(var(--muted))",
  				foreground: "hsl(var(--muted-foreground))",
  			},
  			accent: {
  				DEFAULT: "hsl(var(--accent))",
  				foreground: "hsl(var(--accent-foreground))",
  			},
  			popover: {
  				DEFAULT: "hsl(var(--popover))",
  				foreground: "hsl(var(--popover-foreground))",
  			},
  			card: {
  				DEFAULT: "hsl(var(--card))",
  				foreground: "hsl(var(--card-foreground))",
  			},
            chart: {
                1: "hsl(var(--chart-1))",
                2: "hsl(var(--chart-2))",
                3: "hsl(var(--chart-3))",
                4: "hsl(var(--chart-4))",
                5: "hsl(var(--chart-5))",
            },
            // Semantic colors
            success: {
                DEFAULT: "hsl(142 76% 36%)",
                foreground: "hsl(0 0% 100%)",
            },
            warning: {
                DEFAULT: "hsl(38 92% 50%)",
                foreground: "hsl(0 0% 100%)",
            },
            danger: {
                DEFAULT: "hsl(0 72% 51%)",
                foreground: "hsl(0 0% 100%)",
            },
            sidebar: {
                DEFAULT: "hsl(var(--card))",
                foreground: "hsl(var(--card-foreground))",
                border: "hsl(var(--border))",
            },
  		},
  		borderRadius: {
  			lg: "var(--radius)",
  			md: "calc(var(--radius) - 2px)",
  			sm: "calc(var(--radius) - 4px)",
  		},
        fontFamily: {
            sans: ["Outfit", "sans-serif"],
        },
        keyframes: {
            "fade-in": {
                from: { opacity: "0", transform: "translateY(8px)" },
                to: { opacity: "1", transform: "translateY(0)" },
            },
            "slide-up": {
                from: { opacity: "0", transform: "translateY(16px)" },
                to: { opacity: "1", transform: "translateY(0)" },
            },
            "scale-in": {
                from: { opacity: "0", transform: "scale(0.9)" },
                to: { opacity: "1", transform: "scale(1)" },
            },
            "glow-pulse": {
                "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
                "50%": { boxShadow: "0 0 20px 4px hsl(var(--primary) / 0.15)" },
            },
        },
        animation: {
            "fade-in": "fade-in 0.5s ease-out forwards",
            "slide-up": "slide-up 0.4s ease-out forwards",
            "scale-in": "scale-in 0.3s ease-out forwards",
            "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        },
  	},
  },
  plugins: [tailwindcssAnimate],
}
