import { PeelWrapper, PeelTop, PeelBack, PeelBottom } from "react-peel";

const CARD_WIDTH = 360;
const CARD_HEIGHT = 240;

// Coordinates for 360×240 dimensions
const peelPositions = [
  { x: 358, y: 238 }, // Card 1: Closed (small corner)
  { x: 352, y: 232 }, // Card 2: Small base for jiggle
  { x: 25, y: 40 }    // Card 3: Large reveal
];

type CardData = {
  frontTitle: string;
  frontBody: string;
  backTitle: string;
  backBody: string;
};

function PeelCard({ data, position }: { data: CardData, position: { x: number, y: number } }) {
  return (
    <div className="flex flex-col items-center">
      <PeelWrapper
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        corner="BOTTOM_RIGHT"
        peelPosition={position}
        drag={false}
        className="rounded-2xl overflow-hidden shadow-lg"
      >
        {/* Top layer - what user sees initially */}
        <PeelTop>
          <div 
            className="w-full h-full flex flex-col justify-center p-6"
            style={{ 
              background: "linear-gradient(135deg, #F2EBDC 0%, #89BAD9 100%)",
              color: "#011526"
            }}
          >
            <h3 className="text-lg font-bold mb-3">{data.frontTitle}</h3>
            <p className="text-sm leading-relaxed">{data.frontBody}</p>
          </div>
        </PeelTop>

        {/* Back of the peeled section */}
        <PeelBack>
          <div 
            className="w-full h-full"
            style={{ background: "#D67C4A" }}
          />
        </PeelBack>

        {/* Bottom layer - what gets revealed */}
        <PeelBottom>
          <div className="w-full h-full flex items-center justify-center"
               style={{ background: "#011526", color: "#F2EBDC" }}>
            Revealed content / CTA
          </div>
        </PeelBottom>
      </PeelWrapper>
      
      <div className="mt-3 text-center">
        <div className="text-sm font-medium text-gray-700">Position: x={position.x}, y={position.y}</div>
      </div>
    </div>
  );
}

export default function PeelNew() {
  const cards: CardData[] = [
    {
      frontTitle: "Step 1: Static Peel",
      frontBody: "Bottom-right folded corner indicator (static).",
      backTitle: "Visual Feedback",
      backBody: "This corner hints that the card is interactive."
    },
    {
      frontTitle: "Step 2: Interactive Peel", 
      frontBody: "Small peel area to show interactivity.",
      backTitle: "Hover & Touch Ready",
      backBody: "Responsive to user interaction and accessible."
    },
    {
      frontTitle: "Step 3: Full Reveal",
      frontBody: "Large peel area reveals significant content.",
      backTitle: "Complete Experience",
      backBody: "Full peel effect with smooth animations."
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Peel New - React Peel Effects</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Interactive peel effects using react-peel library with proper geometry and reveal layers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 justify-items-center">
        {cards.map((cardData, index) => (
          <PeelCard 
            key={index} 
            data={cardData} 
            position={peelPositions[index]}
          />
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Technical Implementation:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>PeelWrapper:</strong> 360×240 dimensions with proper geometry</li>
          <li>• <strong>PeelTop:</strong> Initial visible content layer</li>
          <li>• <strong>PeelBack:</strong> Back of the peeled section (orange gradient)</li>
          <li>• <strong>PeelBottom:</strong> Revealed content underneath (MEMOPYK navy)</li>
          <li>• <strong>Coordinates:</strong> Optimized for 360×240 canvas</li>
        </ul>
      </div>
    </div>
  );
}