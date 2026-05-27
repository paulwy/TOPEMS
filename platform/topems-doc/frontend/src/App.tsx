import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FileListPage } from './pages/FileListPage';
import { FileUploadPage } from './pages/FileUploadPage';
import { Layout } from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<FileListPage />} />
          <Route path="upload" element={<FileUploadPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
