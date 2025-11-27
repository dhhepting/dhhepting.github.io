import "./App.css";
import { Canvas } from "@react-three/fiber";
import Cylinder3d from "./component/Cylinder3d";
 
function App() {
  return (
    <>
      <section className='App-header'>
        {/* Canvas 1 */}
        <Canvas>
	  <pointLight position={[10, 10, 10]} intensity={1000} color="#00f" />
          <ambientLight />
          <Cylinder3d position={[-1.2, 0, 0]} />
          <Cylinder3d position={[1.2, 0, 0]} />
        </Canvas>
 
        {/* Canvas 2 */}
        <Canvas>
	  <pointLight position={[10, 10, 10]} intensity={1000} color="#fff" />
          <ambientLight intensity={0.5} />
          <Cylinder3d position={[-1.2, 0, 0]} wireframe={true} />
          <Cylinder3d position={[1.2, 0, 0]} wireframe={true} />
        </Canvas>
 
        {/* Canvas 3 */}
        <Canvas>
	  <pointLight position={[10, 10, 10]} intensity={1000} color="#fff" />
          <ambientLight color={"red"} />
          <Cylinder3d position={[-1.2, 0, 0]} />
          <Cylinder3d position={[1.2, 0, 0]} />
        </Canvas>
      </section>
    </>
  );
}
 
export default App;
