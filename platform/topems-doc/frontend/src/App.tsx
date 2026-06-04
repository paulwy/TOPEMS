import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FileListPage } from './pages/FileListPage';
import { FileUploadPage } from './pages/FileUploadPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { Layout } from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<FileListPage />} />
          <Route path="upload" element={<FileUploadPage />} />
          <Route path="templates" element={<TemplatesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
